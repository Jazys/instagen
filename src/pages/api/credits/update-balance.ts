import { NextApiRequest, NextApiResponse } from 'next';
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error verifying user token:', userError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Get parameters from request body
    const { creditsToAdd, paymentId } = req.body;
    
    if (typeof creditsToAdd !== 'number' || creditsToAdd <= 0) {
      return res.status(400).json({ error: 'Invalid credits amount. Must be a positive number.' });
    }

    // Update user credits in the user_quota table
    try {
      // First get current user quota
      const { data: quotaData, error: fetchError } = await supabase
        .from('user_quotas')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .single();
        
      if (fetchError) {
        console.error('Error fetching user quota:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch user credits' });
      }
      
      const currentCredits = quotaData?.credits_remaining || 0;
      const newCredits = currentCredits + creditsToAdd;
      
      // Update the user's credits in the user_quota table
      const { error: updateError } = await supabase
        .from('user_quota')
        .update({ 
          credits_remaining: newCredits,
          last_reset_date: new Date().toISOString() 
        })
        .eq('user_id', user.id);
        
      if (updateError) {
        console.error('Error updating user credits:', updateError);
        return res.status(500).json({ error: 'Failed to update credits' });
      }

      // Log the transaction in the credits_history table if a payment ID is provided
      if (paymentId) {
        try {
          const { error: historyError } = await supabase
            .from('credits_history')
            .insert({
              user_id: user.id,
              amount: creditsToAdd,
              transaction_type: 'purchase',
              payment_id: paymentId,
              created_at: new Date().toISOString()
            });
            
          if (historyError) {
            console.warn('Could not log credits history:', historyError);
            // Don't fail the whole process if just the history logging fails
          }
        } catch (historyErr) {
          console.warn('Error logging credits history (non-critical):', historyErr);
        }
      }

      // Return success response
      return res.status(200).json({ 
        success: true, 
        message: `Successfully added ${creditsToAdd} credits`,
        newBalance: newCredits 
      });
    } catch (error) {
      console.error('Error updating user credits:', error);
      return res.status(500).json({ error: 'Failed to update credits' });
    }
  } catch (error) {
    console.error('Error processing credits update:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 