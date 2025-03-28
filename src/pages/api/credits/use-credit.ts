import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

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
      console.error('Error verifying user token:', userError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    console.log("Auth successful, user ID:", data.user.id);

    // Create a service role client if the service key is available
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
      console.log("Using service role client for credit usage");
    } else {
      console.log("Service role key not available, using authenticated client");
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

    // Get the action type (optional, default to "test_action")
    const { actionType = "test_action" } = req.body;

    // Check if user has enough credits
    try {
      // Get current user quota
      const { data: quotaData, error: fetchError } = await serviceClient
        .from('user_quotas')
        .select('credits_remaining')
        .eq('user_id', data.user.id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching user credits:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch user credits' });
      }
      
      const currentCredits = quotaData?.credits_remaining || 0;
      
      // Check if user has at least 1 credit
      if (currentCredits < 1) {
        return res.status(402).json({ 
          error: 'Insufficient credits', 
          credits_remaining: currentCredits,
          credits_required: 1
        });
      }
      
      // Update user's credits (reduce by 1)
      const newCredits = currentCredits - 1;
      const { error: updateError } = await serviceClient
        .from('user_quotas')
        .update({ 
          credits_remaining: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', data.user.id);
        
      if (updateError) {
        console.error('Error updating user credits:', updateError);
        return res.status(500).json({ error: 'Failed to update credits' });
      }

      // Log the credit usage
      await serviceClient
        .from('credits_usage_logs')
        .insert({
          user_id: data.user.id,
          action_type: actionType,
          credits_used: 1,
          credits_remaining: newCredits,
          metadata: { 
            timestamp: new Date().toISOString() 
          }
        });

      // Return success response with new balance
      return res.status(200).json({ 
        success: true, 
        message: 'Successfully used 1 credit',
        credits_remaining: newCredits
      });
    } catch (error) {
      console.error('Error processing credit usage:', error);
      return res.status(500).json({ error: 'Failed to process credit usage' });
    }
  } catch (error) {
    console.error('Error in credit usage API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 