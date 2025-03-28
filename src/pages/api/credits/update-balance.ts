import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from the request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing or invalid token' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token and get the user
    const { data, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !data.user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Get parameters from request body
    const { creditsToAdd, paymentId } = req.body;
    
    if (typeof creditsToAdd !== 'number' || creditsToAdd <= 0) {
      return res.status(400).json({ error: 'Invalid credits amount. Must be a positive number.' });
    }

    // Create a service role client if the service key is available
    // This allows us to bypass RLS policies
    let serviceClient;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      serviceClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      );
    } else {
      // If no service role key, we'll use the user's token for authorization
      serviceClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
    }

    // Update user credits in the user_quota table
    try {
      // First get current user quota
      const { data: quotaData, error: fetchError } = await serviceClient
        .from('user_quotas')
        .select('credits_remaining')
        .eq('user_id', data.user.id)
        .single();
      
      let currentCredits = 0;
      
      if (fetchError) {
        // We'll handle this with upsert
      } else {
        currentCredits = quotaData?.credits_remaining || 0;
      }
      
      const newCredits = currentCredits + creditsToAdd;
      
      // Update the user's credits in the user_quota table using service client
      const { error: updateError } = await serviceClient
        .from('user_quotas')
        .upsert({ 
          user_id: data.user.id,
          credits_remaining: newCredits,
          last_reset_date: new Date().toISOString(),
          next_reset_date: getNextMonthDate() // Add next reset date
        });
        
      if (updateError) {
        return res.status(500).json({ error: 'Failed to update credits' });
      }

      // Log the transaction in the credits_history table if a payment ID is provided
      if (paymentId) {
        try {
          const { error: historyError } = await serviceClient
            .from('credits_history')
            .insert({
              user_id: data.user.id,
              amount: creditsToAdd,
              transaction_type: 'purchase',
              payment_id: paymentId,
              notes: 'Credit purchase via Stripe',
              created_at: new Date().toISOString()
            });
          
          // Non-critical error - don't fail the whole process
        } catch (historyErr) {
          // Non-critical error - don't fail the whole process
        }
      }

      // Return success response
      return res.status(200).json({ 
        success: true, 
        message: `Successfully added ${creditsToAdd} credits`,
        newBalance: newCredits 
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update credits' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to calculate the next month's reset date (1st of next month)
function getNextMonthDate(): string {
  const today = new Date();
  // Set to 1st day of next month
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return nextMonth.toISOString();
} 