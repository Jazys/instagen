import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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

    // Get current user credits from user_quota table
    const { data: quotaData, error: fetchError } = await supabase
      .from('user_quotas')
      .select('credits_remaining, last_reset_date, next_reset_date')
      .eq('user_id', user.id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching user quota:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user credits' });
    }

    // Return success response with credit information
    return res.status(200).json({ 
      success: true,
      credits: quotaData?.credits_remaining || 0,
      last_updated: quotaData?.last_reset_date || null,
      next_reset: quotaData?.next_reset_date || null
    });
  } catch (error) {
    console.error('Error checking credits:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 