import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Create a single instance of the Supabase client to be used throughout the app
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,  // Enable persistent sessions
      storageKey: 'sb-auth-token',  // Change the storage key to avoid potential conflicts
      autoRefreshToken: true,  // Automatically refresh the token
      detectSessionInUrl: true,  // Detect session in URL (for OAuth)
      storage: typeof window !== 'undefined' ? localStorage : undefined, // Force localStorage
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js@2.39.7',
      },
    }
  }
) 