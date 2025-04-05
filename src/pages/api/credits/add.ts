import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/auth';

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

    // Get the packSize from the request body
    const { packSize, userId } = req.body;
    
    if (!packSize) {
      return res.status(400).json({ error: 'Missing packSize parameter' });
    }
    
    // Make sure the userId in the request matches the authenticated user
    if (userId && userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden - User ID mismatch' });
    }

    // Define credit packs (same as in the frontend for consistency)
    const CREDIT_PACKS: { [key: string]: number } = {
      'small': 100,
      'medium': 300,
      'large': 1000
    };
    
    if (!CREDIT_PACKS[packSize]) {
      return res.status(400).json({ error: 'Invalid packSize' });
    }
    
    const creditsToAdd = CREDIT_PACKS[packSize];

    // Get current user credits
    const { data: userData, error: fetchError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single();
      
    // Note: PGRST116 means no rows found
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user credits:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user credits' });
    }
    
    const currentCredits = userData?.credits || 0;
    const newCredits = currentCredits + creditsToAdd;
    
    // Update or insert user credits
    const { error: updateError } = await supabase
      .from('user_credits')
      .upsert({ 
        user_id: user.id, 
        credits: newCredits,
        updated_at: new Date().toISOString() 
      });
      
    if (updateError) {
      console.error('Error updating user credits:', updateError);
      return res.status(500).json({ error: 'Failed to update credits' });
    }

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: `Successfully added ${creditsToAdd} credits`,
      credits: newCredits 
    });
    
  } catch (error) {
    console.error('Error processing credits addition:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 