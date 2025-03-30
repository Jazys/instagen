import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Simple logging function for webhook events
const logToFile = (message: string, data?: any) => {
  console.log(`[STRIPE_WEBHOOK] ${message}`, data || '');
};

// Create a service role client if the service key is available
const getServiceClient = () => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
  }
  // Fallback to regular client
  return supabase;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    try {
      if (isDevelopment && req.headers['x-webhook-test'] === 'true') {
        // In development with test header, parse the event from the body
        event = JSON.parse(buf.toString()) as Stripe.Event;
      } else {
        // Production mode, verify the signature
        event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
      }
    } catch (err) {
      const error = err as Error;
      return res.status(400).json({ error: `Webhook Error: ${error.message}` });
    }

    // Handle specific events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Process the successful payment
      await handleSuccessfulPayment(session);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const credits = parseInt(session.metadata?.credits || '0');
  // Get pre-payment balance from metadata if available
  const prePaymentBalance = parseInt(session.metadata?.prePaymentBalance || '0');
  
  logToFile('Starting handleSuccessfulPayment', { 
    sessionId: session.id,
    userId,
    credits,
    prePaymentBalance
  });
  
  if (!userId || !credits) {
    logToFile('Missing userId or credits, cannot process payment', { userId, credits });
    return;
  }
  
  try {
    // Get the service client to bypass RLS
    const serviceClient = getServiceClient();
    
    // First, get the current credits from user_quotas to make sure we're not duplicating
    logToFile('Fetching current credits', { userId });
    const { data: quotaData, error: quotaError } = await serviceClient
      .from('user_quotas')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();
    
    if (quotaError) {
      logToFile('Error fetching quota data', { error: quotaError });
      throw quotaError;
    }
    
    const currentCredits = quotaData?.credits_remaining || 0;
    
    // If we have a pre-payment balance, use it to determine if payment was already applied
    if (prePaymentBalance > 0) {
      const expectedCredits = prePaymentBalance + credits;
      
      // If current credits are already at or above expected, payment was likely already processed
      if (currentCredits >= expectedCredits) {
        logToFile('Credits already at or above expected level', { 
          currentCredits, 
          expectedCredits, 
          prePaymentBalance 
        });
        return; // Exit early, no need to update again
      }
    }
    
    const newCreditBalance = currentCredits + credits;
    
    logToFile('Updating credits', { 
      userId,
      currentCredits,
      creditsToAdd: credits,
      newCreditBalance,
      prePaymentBalance: prePaymentBalance || 'not provided'
    });
    
    // Update the user's credit balance
    const { error: updateError } = await serviceClient
      .from('user_quotas')
      .update({ 
        credits_remaining: newCreditBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      throw updateError;
    }
    
    // Log the credit purchase
    await serviceClient
      .from('credits_usage_logs')
      .insert({
        user_id: userId,
        action_type: 'purchase',
        credits_used: -credits, // Negative to indicate credits added
        credits_remaining: newCreditBalance,
      });
    
    // Also log to credits_history for better tracking
    await serviceClient
      .from('credits_history')
      .insert({
        user_id: userId,
        amount: credits,
        transaction_type: 'purchase',
        payment_id: session.id,
        notes: 'Credit purchase via Stripe webhook',
        created_at: new Date().toISOString()
      });
    
  } catch (error) {
    throw error;
  }
} 