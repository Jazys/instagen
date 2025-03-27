import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabase } from '@/lib/supabase';

// Disable Next.js body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'missing_key', {
  apiVersion: '2025-01-27.acacia',
});

// Stripe webhook secret for verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the raw request body
    const rawBody = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    console.log('Received Stripe webhook');
    
    let event: Stripe.Event;

    // Verify the signature if we have a webhook secret
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(rawBody.toString(), sig, webhookSecret);
      } catch (err: any) {
        console.error('Error verifying webhook signature:', err);
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      }
    } else {
      // If no webhook secret, just parse the event (not secure for production)
      try {
        event = JSON.parse(rawBody.toString());
        console.warn('WARNING: Processing unverified webhook event (no STRIPE_WEBHOOK_SECRET set)');
      } catch (err: any) {
        console.error('Error parsing webhook payload:', err);
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }
    }

    console.log('Webhook event type:', event.type);

    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Ensure the payment was successful
        if (session.payment_status === 'paid') {
          console.log('Payment successful, processing credits update');
          
          // Get the user ID and credits from the metadata
          const userId = session.metadata?.userId || session.client_reference_id;
          const credits = session.metadata?.credits;
          
          if (!userId) {
            console.error('No user ID found in session metadata or client_reference_id');
            return res.status(400).json({ error: 'User ID not found in session data' });
          }
          
          if (!credits) {
            console.error('No credits value found in session metadata');
            return res.status(400).json({ error: 'Credits amount not found in session data' });
          }
          
          console.log(`Processing credit update for user ${userId}: adding ${credits} credits`);
          
          // Update user's credits in Supabase
          try {
            // First, get current credits (if any)
            const { data: userData, error: fetchError } = await supabase
              .from('user_credits')
              .select('credits')
              .eq('user_id', userId)
              .single();
              
            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
              console.error('Error fetching user credits:', fetchError);
              throw fetchError;
            }
            
            const currentCredits = userData?.credits || 0;
            const newCredits = currentCredits + parseInt(credits, 10);
            
            console.log(`Updating credits: ${currentCredits} + ${credits} = ${newCredits}`);
            
            // Then update or insert user credits
            const { error: updateError } = await supabase
              .from('user_credits')
              .upsert({ 
                user_id: userId, 
                credits: newCredits,
                updated_at: new Date().toISOString() 
              });
              
            if (updateError) {
              console.error('Error updating user credits:', updateError);
              throw updateError;
            }
            
            console.log('Credits updated successfully');
            
            // Also log this transaction in a credits_history table if it exists
            try {
              const { error: historyError } = await supabase
                .from('credits_history')
                .insert({
                  user_id: userId,
                  amount: parseInt(credits, 10),
                  transaction_type: 'purchase',
                  payment_id: session.id,
                  created_at: new Date().toISOString()
                });
                
              if (historyError) {
                console.warn('Could not log credits history:', historyError);
                // Don't fail the whole process if just the history logging fails
              } else {
                console.log('Credits history logged successfully');
              }
            } catch (historyErr) {
              console.warn('Error logging credits history (non-critical):', historyErr);
            }
          } catch (error) {
            console.error('Failed to update user credits:', error);
            return res.status(500).json({ error: 'Failed to update user credits' });
          }
        }
        break;
      }
      
      // Handle other event types if needed
      case 'payment_intent.succeeded':
        // This event is often redundant with checkout.session.completed for our use case
        console.log('PaymentIntent succeeded (no action needed, handled by checkout.session.completed)');
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a success response to Stripe
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
} 