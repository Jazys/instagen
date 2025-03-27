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
          console.error("Failed to parse stored user data:", e);
        }
      }
    }
    
    // Fallback to Supabase SDK
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error("Error fetching user:", error.message)
      return null
    }
    
    return user
  } catch (error) {
    console.error("Failed to get user:", error)
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
    if (error) console.error("Error during Supabase sign out:", error.message)
    
    // Force a reload to clear any lingering state
    if (typeof window !== 'undefined') {
      window.location.replace('/')
    }
  } catch (error) {
    console.error("Error during sign out:", error)
    throw error
  }
}

// Helper function to get session from multiple sources
export async function getSession(): Promise<Session | null> {
  try {
    // First priority: check localStorage directly
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem(STORAGE_KEY)
      console.log('LocalStorage check for session:', storedSession ? 'FOUND' : 'NOT FOUND');
      
      if (storedSession) {
        try {
          // Parse and validate stored session
          const parsedSession = JSON.parse(storedSession)
          console.log('Parsed session from localStorage:', !!parsedSession);
          
          // Ensure the session is set in Supabase client
          if (parsedSession.access_token && parsedSession.refresh_token) {
            try {
              // Set session in Supabase client
              const { data } = await supabase.auth.setSession({
                access_token: parsedSession.access_token,
                refresh_token: parsedSession.refresh_token
              })
              
              if (data.session) {
                console.log('Session successfully set in Supabase client');
                return data.session;
              }
            } catch (e) {
              console.error("Failed to set session in Supabase client:", e);
            }
            
            // Return manually constructed session if Supabase setSession fails
            if (parsedSession.user && parsedSession.expires_at) {
              console.log('Using manually constructed session from localStorage');
              return parsedSession as Session;
            }
          }
        } catch (e) {
          console.error("Failed to parse stored session:", e)
        }
      }
    }
    
    // Second priority: standard Supabase method
    console.log('Trying Supabase getSession method...');
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session) {
      console.log('Session found via Supabase.auth.getSession');
      return session;
    }
    
    // Last resort: try to refresh
    console.log('Trying to refresh session...');
    const { data } = await supabase.auth.refreshSession()
    if (data.session) {
      console.log('Session refreshed successfully');
      return data.session;
    }
    
    console.log('No session found through any method');
    return null;
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

/**
 * Helper function to get the access token directly from localStorage first
 * @returns The access token string or null if not found
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    console.log('Getting access token...');
    
    // First priority: check localStorage
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem(STORAGE_KEY);
      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession);
          if (parsedSession.access_token) {
            console.log('Access token found in localStorage');
            return parsedSession.access_token;
          }
        } catch (e) {
          console.error("Failed to parse stored session:", e);
        }
      }
    }
    
    // Second priority: get from session
    console.log('Falling back to session for access token');
    const session = await getSession();
    if (session?.access_token) {
      console.log('Access token found in session');
      return session.access_token;
    }
    
    console.log('No access token found');
    return null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    console.log("Auth state changed:", event, session?.user?.id || "no user")
    
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