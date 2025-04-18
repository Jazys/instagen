/**
 * Centralized Stripe configuration
 */
import Stripe from 'stripe';

// Create a Stripe instance with the desired API version
export const createStripeClient = (secretKey?: string): Stripe => {
  const key = secretKey || process.env.STRIPE_SECRET_KEY || '';
  
  if (!key) {
    throw new Error('Stripe Secret Key is required');
  }
  
  // Forcer l'utilisation de l'API basil avec un cast explicite
  return new Stripe(key, {
    apiVersion: '2025-03-31.basil' as any,
  });
};

// Export a singleton for convenience
export const stripe = createStripeClient(); 