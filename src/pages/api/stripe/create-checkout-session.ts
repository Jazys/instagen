import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialize Stripe
let stripe: Stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'missing_key', {
    apiVersion: '2025-01-27.acacia',
  });
} catch (error) {
  // We'll handle this in the API route when it's called
}

const CREDIT_PACKS = {
  'small': { credits: 100, price: 1000 }, // 10 EUR (price in cents)
  'medium': { credits: 300, price: 2500 }, // 25 EUR
  'large': { credits: 1000, price: 7500 }, // 75 EUR
};

type CreditPackKey = keyof typeof CREDIT_PACKS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check if Stripe is initialized
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ 
      error: 'Stripe configuration error',
      message: 'The server is not configured correctly for payment processing. Please contact support.'
    });
  }

  // Get user's authentication from token in Authorization header
  let userId: string;
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify the token with Supabase
        const { data, error } = await supabase.auth.getUser(token);
        
        if (error) {
          return res.status(401).json({
            error: 'Authentication failed',
            message: 'Your session appears to be invalid. Please log in again.'
          });
        }
        
        if (!data.user) {
          return res.status(401).json({
            error: 'Authentication failed',
            message: 'User not found. Please log in again.'
          });
        }
        
        userId = data.user.id;
      } catch (verifyError) {
        return res.status(401).json({
          error: 'Token verification failed',
          message: 'Authentication error. Please log in again.'
        });
      }
    } else {
      // Fallback to explicit userId in request body for testing/compatibility
      const { userId: bodyUserId } = req.body;
      
      if (!bodyUserId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to purchase credits'
        });
      }
      
      userId = bodyUserId;
    }
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication error',
      message: 'There was an issue with your authentication. Please try logging in again.'
    });
  }

  try {
    const { packSize = 'small', successUrl, cancelUrl } = req.body;
    
    if (!Object.keys(CREDIT_PACKS).includes(packSize)) {
      return res.status(400).json({ 
        error: 'Invalid pack size',
        message: `Pack size must be one of: ${Object.keys(CREDIT_PACKS).join(', ')}` 
      });
    }
    
    const pack = CREDIT_PACKS[packSize as CreditPackKey];
    
    // Set default success and cancel URLs if not provided
    const defaultBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    // Include pack size and session ID in the success URL
    const defaultSuccessUrl = `${defaultBaseUrl}/dashboard/credits?success=true&pack=${packSize}&session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${defaultBaseUrl}/dashboard/credits?canceled=true`;
    
    // Process successUrl to replace {CHECKOUT_SESSION_ID} placeholder if needed
    const finalSuccessUrl = successUrl ? 
      (successUrl.includes('{CHECKOUT_SESSION_ID}') ? 
        successUrl : 
        `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`) : 
      defaultSuccessUrl;
    
    // Use client-provided URLs if available, otherwise use defaults
    const finalCancelUrl = cancelUrl || defaultCancelUrl;
    
    // Create Checkout Session
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${pack.credits} Credits`,
                description: 'Digital credits for Instagen platform',
              },
              unit_amount: pack.price, // Price in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        client_reference_id: userId,
        metadata: {
          credits: pack.credits.toString(),
          packSize: packSize,
          prePaymentBalance: req.body.prePaymentBalance?.toString() || '0',
        },
      });

      // Return the session to the client
      return res.status(200).json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (stripeError) {
      return res.status(500).json({
        error: 'Stripe Error',
        message: stripeError instanceof Error ? stripeError.message : 'An error occurred with the payment processor'
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Server Error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
} 