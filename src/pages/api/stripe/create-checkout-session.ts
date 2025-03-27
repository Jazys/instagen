import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const CREDIT_PACKS = {
  'small': { credits: 100, price: 1000 }, // 10 EUR (price in cents)
  'medium': { credits: 300, price: 2500 }, // 25 EUR
  'large': { credits: 1000, price: 7500 }, // 75 EUR
};

type CreditPackKey = keyof typeof CREDIT_PACKS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user's authentication from token in Authorization header
  let userId: string;
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Please log in to purchase credits'
        });
      }
      
      userId = user.id;
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
    console.error('Auth error:', error);
    return res.status(401).json({
      error: 'Authentication error',
      message: 'There was an issue with your authentication'
    });
  }

  try {
    const { packSize = 'small' } = req.body;
    
    if (!Object.keys(CREDIT_PACKS).includes(packSize)) {
      return res.status(400).json({ 
        error: 'Invalid pack size',
        message: `Pack size must be one of: ${Object.keys(CREDIT_PACKS).join(', ')}` 
      });
    }
    
    const pack = CREDIT_PACKS[packSize as CreditPackKey];
    const priceInEuros = pack.price / 100;
    
    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${pack.credits} Credits Pack`,
              description: `Purchase of ${pack.credits} credits for your account`,
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/credits/buy`,
      client_reference_id: userId,
      metadata: {
        userId,
        packSize,
        credits: pack.credits.toString(),
      },
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 