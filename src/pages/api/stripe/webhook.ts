import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error(`Webhook signature verification failed: ${error.message}`);
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
    console.error('Error handling webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const credits = parseInt(session.metadata?.credits || '0');
  
  if (!userId || !credits) {
    console.error('Missing userId or credits in session metadata', session.metadata);
    return;
  }
  
  try {
    // First, get the current credits from user_quotas
    const { data: quotaData, error: quotaError } = await supabase
      .from('user_quotas')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();
    
    if (quotaError) {
      console.error('Error fetching user quota:', quotaError.message);
      throw quotaError;
    }
    
    const currentCredits = quotaData?.credits_remaining || 0;
    const newCreditBalance = currentCredits + credits;
    
    // Update the user's credit balance
    const { error: updateError } = await supabase
      .from('user_quotas')
      .update({ 
        credits_remaining: newCreditBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error updating user credits:', updateError.message);
      throw updateError;
    }
    
    // Log the credit purchase
    await supabase
      .from('credits_usage_logs')
      .insert({
        user_id: userId,
        action_type: 'purchase',
        credits_used: -credits, // Negative to indicate credits added
        credits_remaining: newCreditBalance,
      });
    
    console.log(`Successfully added ${credits} credits for user ${userId}. New balance: ${newCreditBalance}`);
  } catch (error) {
    console.error('Error processing successful payment:', error);
    throw error;
  }
} 