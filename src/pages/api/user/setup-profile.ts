import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'

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
  
  try {
    // Create server-side Supabase client with version 0.9.0 API
    const supabaseServerClient = createServerSupabaseClient<Database>({ req, res })
    
    // Get the user from the session
    const {
      data: { session },
    } = await supabaseServerClient.auth.getSession()
    
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    
    const { user } = session
    
    // Create or update the user profile
    const { error: profileError } = await supabaseServerClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        username: req.body.username || user.email?.split('@')[0] || null,
        full_name: req.body.fullName || user.user_metadata?.full_name || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
    
    if (profileError) {
      console.error('Error creating profile:', profileError)
      return res.status(500).json({ error: `Failed to create profile: ${profileError.message}` })
    }
    
    // Check if user quota exists
    const { data: existingQuota, error: quotaCheckError } = await supabaseServerClient
      .from('user_quotas')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (quotaCheckError) {
      console.error('Error checking quota:', quotaCheckError)
    }
    
    // Only create quota if it doesn't exist
    if (!existingQuota) {
      const { error: quotaError } = await supabaseServerClient
        .from('user_quotas')
        .insert({
          user_id: user.id,
          credits_remaining: 10, // Default starting credits
          next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          last_reset_date: new Date().toISOString(),
        })
      
      if (quotaError) {
        console.error('Error creating quota:', quotaError)
        return res.status(500).json({ error: `Failed to create quota: ${quotaError.message}` })
      }
    }
    
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Server error in setup-profile:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 