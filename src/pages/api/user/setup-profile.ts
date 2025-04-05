import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'
import { createClient } from '@supabase/supabase-js'

/**
 * API endpoint to set up a user's profile and quota
 * This runs server-side with proper permissions to bypass RLS
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  let serviceClient = null;
  let userId = null;
  
  try {
    // Create server-side Supabase client with version 0.9.0 API
    const supabaseServerClient = createServerSupabaseClient<Database>({ req, res })
    
    // Get the user from the session
    const {
      data: { session },
    } = await supabaseServerClient.auth.getSession()
    
    // User can either be from the session or explicitly provided
    if (session) {
      userId = session.user.id;
    } else if (req.body.userId) {
      // If user ID is provided explicitly, create a service client
      userId = req.body.userId;
      
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        serviceClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          }
        );
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated or missing userId' })
    }
    
    // Use appropriate client (server client with session or service client)
    const client = serviceClient || supabaseServerClient;
    
    // First, check if the database trigger already created the profile and quota
    // This avoids unnecessary work and potential conflicts
    const [profileResult, quotaResult] = await Promise.all([
      client.from('profiles').select('id').eq('id', userId).single(),
      client.from('user_quotas').select('user_id').eq('user_id', userId).single()
    ]);
    
    const profileExists = !profileResult.error && profileResult.data;
    const quotaExists = !quotaResult.error && quotaResult.data;
    
    // Log what we found
    console.log(`API: Checking existing resources for user ${userId.substring(0, 8)}...`, {
      profileExists,
      quotaExists
    });
    
    let profileCreated = Boolean(profileExists);
    let quotaCreated = Boolean(quotaExists);
    
    // User data from request or session
    const userEmail = req.body.email || (session?.user?.email);
    const userName = req.body.username || (session?.user?.user_metadata?.username) || (userEmail?.split('@')[0]);
    const fullName = req.body.fullName || (session?.user?.user_metadata?.full_name);
    
    // Only create profile if it doesn't already exist
    if (!profileExists) {
      console.log(`API: Creating profile for user ${userId.substring(0, 8)}`);
      
      // Create or update the user profile with retry mechanism
      let profileError = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const { error, data } = await client
            .from('profiles')
            .upsert({
              id: userId,
              email: userEmail,
              username: userName || userEmail?.split('@')[0] || null,
              full_name: fullName || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            });
          
          profileError = error;
          profileCreated = !error;
          
          if (!error) {
            console.log(`API: Profile created successfully for user ${userId.substring(0, 8)}`);
            break;
          }
          
          console.log(`API: Profile creation attempt ${retries + 1} failed, retrying...`, error);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        } catch (e) {
          profileError = e;
          console.error(`API: Error in profile creation attempt ${retries + 1}:`, e);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (profileError) {
        console.error('API: Error creating profile after retries:', profileError)
      }
    }
    
    // Only create quota if it doesn't already exist
    if (!quotaExists) {
      console.log(`API: Creating quota for user ${userId.substring(0, 8)}`);
      
      let quotaError = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const { error } = await client
            .from('user_quotas')
            .upsert({
              user_id: userId,
              credits_remaining: 100, // Default starting credits
              next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              last_reset_date: new Date().toISOString(),
            }, { 
              onConflict: 'user_id' 
            });
          
          quotaError = error;
          quotaCreated = !error;
          
          if (!error) {
            console.log(`API: Quota created successfully for user ${userId.substring(0, 8)}`);
            break;
          }
          
          console.log(`API: Quota creation attempt ${retries + 1} failed, retrying...`, error);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        } catch (e) {
          quotaError = e;
          console.error(`API: Error in quota creation attempt ${retries + 1}:`, e);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (quotaError) {
        console.error('API: Error creating quota after retries:', quotaError)
      }
    }
    
    // Report success status back to client
    return res.status(200).json({ 
      success: true,
      profileCreated,
      quotaCreated,
      message: profileCreated && quotaCreated 
        ? "Profile and quota created/updated successfully"
        : profileCreated 
          ? "Profile created, but quota creation failed"
          : quotaCreated
            ? "Quota created, but profile creation failed"
            : "Failed to create profile and quota"
    });
  } catch (error) {
    console.error('API: Server error in setup-profile:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 