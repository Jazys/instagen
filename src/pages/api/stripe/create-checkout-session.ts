import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

console.log("API MODULE LOADED: create-checkout-session.ts");

// Check for Stripe Secret Key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("CRITICAL ERROR: STRIPE_SECRET_KEY is not defined in environment variables");
  console.error("Please add STRIPE_SECRET_KEY to your .env.local file");
}

// Initialize Stripe with more robust error handling
let stripe: Stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'missing_key', {
    apiVersion: '2025-01-27.acacia',
  });
  console.log("Stripe initialized successfully");
} catch (error) {
  console.error("Failed to initialize Stripe client:", error);
  // We'll handle this in the API route when it's called
}

const CREDIT_PACKS = {
  'small': { credits: 100, price: 1000 }, // 10 EUR (price in cents)
  'medium': { credits: 300, price: 2500 }, // 25 EUR
  'large': { credits: 1000, price: 7500 }, // 75 EUR
};

type CreditPackKey = keyof typeof CREDIT_PACKS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("==========================================");
  console.log("API HANDLER CALLED: create-checkout-session");
  console.log("Request method:", req.method);
  
  // Check if Stripe is initialized
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("API HANDLER ERROR: Stripe Secret Key is missing");
    return res.status(500).json({ 
      error: 'Stripe configuration error',
      message: 'The server is not configured correctly for payment processing. Please contact support.'
    });
  }
  
  // Log all headers for debugging
  console.log("All request headers:");
  Object.keys(req.headers).forEach(key => {
    console.log(`${key}: ${key === 'authorization' ? 'HIDDEN FOR SECURITY' : req.headers[key]}`);
  });
  
  console.log("Request headers summary:", {
    authorization: req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 15)}...` : "MISSING",
    cookie: req.headers.cookie ? "[EXISTS]" : "MISSING",
    "content-type": req.headers["content-type"]
  });
  
  console.log("Request body:", req.body);
  console.log("STRIPE_SECRET_KEY configured:", !!process.env.STRIPE_SECRET_KEY);
  console.log("NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL);
  
  if (req.method !== 'POST') {
    console.log("METHOD NOT ALLOWED:", req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user's authentication from token in Authorization header
  let userId: string;
  try {
    const authHeader = req.headers.authorization;
    
    console.log('Auth header present:', !!authHeader);
    if (authHeader) {
      console.log('Auth header format check:', authHeader.startsWith('Bearer ') ? 'CORRECT' : 'INCORRECT');
    }
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token found in authorization header, length:', token.length);
      console.log('Token first 10 chars:', token.substring(0, 10) + '...');
      
      try {
        console.log('Attempting to verify token with Supabase...');
        // Verify the token with Supabase
        const { data, error } = await supabase.auth.getUser(token);
        
        console.log('Supabase auth.getUser response:', {
          hasData: !!data,
          hasUser: !!data?.user,
          hasError: !!error,
          errorMessage: error?.message
        });
        
        if (error) {
          console.error('Token verification error:', error.message);
          return res.status(401).json({
            error: 'Authentication failed',
            message: 'Your session appears to be invalid. Please log in again.'
          });
        }
        
        if (!data.user) {
          console.error('No user found with provided token');
          return res.status(401).json({
            error: 'Authentication failed',
            message: 'User not found. Please log in again.'
          });
        }
        
        console.log('User authenticated successfully via token:', data.user.id);
        console.log('User email:', data.user.email);
        userId = data.user.id;
      } catch (verifyError) {
        console.error('Error verifying token:', verifyError);
        console.error('Error details:', JSON.stringify(verifyError));
        return res.status(401).json({
          error: 'Token verification failed',
          message: 'Authentication error. Please log in again.'
        });
      }
    } else {
      // Fallback to explicit userId in request body for testing/compatibility
      console.log('No auth header, checking for userId in body...');
      const { userId: bodyUserId } = req.body;
      console.log('userId in body:', bodyUserId);
      
      if (!bodyUserId) {
        console.error('No userId in body, authentication failed');
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to purchase credits'
        });
      }
      
      console.log('Using userId from request body:', bodyUserId);
      userId = bodyUserId;
    }
    
    console.log('Authentication successful, proceeding with userId:', userId);
  } catch (error) {
    console.error('Auth error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    return res.status(401).json({
      error: 'Authentication error',
      message: 'There was an issue with your authentication. Please try logging in again.'
    });
  }

  try {
    const { packSize = 'small', successUrl, cancelUrl } = req.body;
    
    console.log('Package selection:', { 
      requestedPack: packSize,
      validPack: Object.keys(CREDIT_PACKS).includes(packSize)
    });
    
    if (!Object.keys(CREDIT_PACKS).includes(packSize)) {
      console.error('Invalid pack size:', packSize);
      return res.status(400).json({ 
        error: 'Invalid pack size',
        message: `Pack size must be one of: ${Object.keys(CREDIT_PACKS).join(', ')}` 
      });
    }
    
    const pack = CREDIT_PACKS[packSize as CreditPackKey];
    const priceInEuros = pack.price / 100;
    
    console.log('Creating Stripe checkout session for:', {
      userId,
      packSize,
      credits: pack.credits,
      price: priceInEuros
    });
    
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
    
    console.log('Checkout session URLs:', {
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl
    });
    
    console.log('Initializing Stripe checkout session creation...');
    // Create Checkout Session
    try {
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
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        client_reference_id: userId,
        metadata: {
          userId,
          packSize,
          credits: pack.credits.toString(),
        },
      });

      console.log('Checkout session created successfully:', {
        sessionId: session.id,
        hasUrl: !!session.url,
        url: session.url ? `${session.url.substring(0, 30)}...` : null
      });

      return res.status(200).json({ 
        sessionId: session.id,
        url: session.url
      });
    } catch (stripeError) {
      console.error('Stripe checkout session creation error:', stripeError);
      console.error('Stripe error details:', JSON.stringify(stripeError));
      throw stripeError;
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  } finally {
    console.log("API HANDLER COMPLETED: create-checkout-session");
    console.log("==========================================");
  }
} 