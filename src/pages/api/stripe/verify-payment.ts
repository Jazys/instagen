import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get session_id from query params
  const { session_id } = req.query;
  
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ 
      error: 'Missing session ID',
      message: 'Session ID is required to verify payment' 
    });
  }

  // Get user's authentication from token in Authorization header
  let userId: string | undefined;
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Please log in to verify your payment'
        });
      }
      
      userId = user.id;
    } else {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to verify payments'
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      error: 'Authentication error',
      message: 'There was an issue with your authentication'
    });
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // Verify that this session belongs to the authenticated user
    if (session.client_reference_id !== userId) {
      return res.status(403).json({ 
        error: 'Unauthorized',
        message: 'You are not authorized to access this payment session' 
      });
    }
    
    // Check if the payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Payment not completed',
        message: `Payment status is ${session.payment_status}` 
      });
    }
    
    return res.status(200).json({
      success: true,
      payment_status: session.payment_status,
      amount: session.amount_total,
      credits: parseInt(session.metadata?.credits || '0'),
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ 
      error: 'Failed to verify payment',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 