import { supabase } from './supabase'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

// Define the storage key in a single place to ensure consistency
export const STORAGE_KEY = 'sb-auth-token'

export async function getUser(): Promise<User | null> {
  try {
    // First check localStorage for session
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem(STORAGE_KEY);
      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession);
          if (parsedSession.user) {
            return parsedSession.user;
          }
        } catch (e) {
          // Silent fail on parse error
        }
      }
    }
    
    // Fallback to Supabase SDK
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return null
    }
    
    return user
  } catch (error) {
    return null
  }
}

export async function signOut(): Promise<void> {
  try {
    // Clear local storage first
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    
    // Then sign out from Supabase (less critical if it fails)
    const { error } = await supabase.auth.signOut()
    
    // Force a reload to clear any lingering state
    if (typeof window !== 'undefined') {
      window.location.replace('/')
    }
  } catch (error) {
    throw error
  }
}

// Helper function to get session from multiple sources
export async function getSession(): Promise<Session | null> {
  try {
    // First priority: check localStorage directly
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem(STORAGE_KEY)
      
      if (storedSession) {
        try {
          // Parse and validate stored session
          const parsedSession = JSON.parse(storedSession)
          
          // Ensure the session is set in Supabase client
          if (parsedSession.access_token && parsedSession.refresh_token) {
            try {
              // Set session in Supabase client
              const { data } = await supabase.auth.setSession({
                access_token: parsedSession.access_token,
                refresh_token: parsedSession.refresh_token
              })
              
              if (data.session) {
                return data.session;
              }
            } catch (e) {
              // Silent fail, continue to next method
            }
            
            // Return manually constructed session if Supabase setSession fails
            if (parsedSession.user && parsedSession.expires_at) {
              return parsedSession as Session;
            }
          }
        } catch (e) {
          // Silent fail, continue to next method
        }
      }
    }
    
    // Second priority: standard Supabase method
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session) {
      return session;
    }
    
    // Last resort: try to refresh
    const { data } = await supabase.auth.refreshSession()
    if (data.session) {
      return data.session;
    }
    
    return null;
  } catch (error) {
    return null
  }
}

/**
 * Helper function to get the access token directly from localStorage first
 * @returns The access token string or null if not found
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // First priority: check localStorage
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem(STORAGE_KEY);
      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession);
          if (parsedSession.access_token) {
            return parsedSession.access_token;
          }
        } catch (e) {
          // Silent fail, continue to next method
        }
      }
    }
    
    // Second priority: get from session
    const session = await getSession();
    if (session?.access_token) {
      return session.access_token;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    if (event === 'SIGNED_OUT') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // Ensure we update localStorage with the latest session
      if (typeof window !== 'undefined' && session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      }
    }
    
    callback(session?.user || null)
  })
} 