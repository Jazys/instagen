import { supabase } from './supabase'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

// Define the storage key in a single place to ensure consistency
export const STORAGE_KEY = 'sb-auth-token'

// Get the base URL from environment or fallback to localhost
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

/**
 * Retrieve a stored session from localStorage
 * @returns The parsed session or null if not available
 */
function getStoredSession(): Session | null {
  if (typeof window === 'undefined') return null;
  
  const storedSession = localStorage.getItem(STORAGE_KEY);
  if (!storedSession) return null;
  
  try {
    const parsedSession = JSON.parse(storedSession);
    // Validate that it has the minimum required properties
    if (parsedSession.access_token && parsedSession.refresh_token) {
      return parsedSession as Session;
    }
  } catch (e) {
    // Silent fail on parse error
  }
  
  return null;
}

/**
 * Store a session in localStorage
 */
export function storeSession(session: Session | null): void {
  if (typeof window === 'undefined' || !session) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Clear stored session from localStorage
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get the current user from localStorage first, then fallback to Supabase
 */
export async function getUser(): Promise<User | null> {
  try {
    // Check localStorage first
    const storedSession = getStoredSession();
    if (storedSession?.user) {
      return storedSession.user;
    }
    
    // Fallback to Supabase SDK
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Sign out the user, clearing session data
 */
export async function signOut(): Promise<void> {
  try {
    clearSession();
    await supabase.auth.signOut();
    
    // Force a reload to clear any lingering state
    if (typeof window !== 'undefined') {
      window.location.replace(`${BASE_URL}/`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Get the current session using a multi-layered approach
 */
export async function getSession(): Promise<Session | null> {
  try {
    // First priority: check localStorage
    const storedSession = getStoredSession();
    if (storedSession) {
      // Ensure the session is set in Supabase client
      try {
        const { data } = await supabase.auth.setSession({
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token
        });
        
        if (data.session) {
          return data.session;
        }
      } catch {
        // Silent fail, continue to fallback
      }
      
      // Return stored session if Supabase setSession fails
      if (storedSession.user && storedSession.expires_at) {
        return storedSession;
      }
    }
    
    // Second priority: standard Supabase method
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      storeSession(session);
      return session;
    }
    
    // Last resort: try to refresh
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      storeSession(data.session);
      return data.session;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper function to get the access token directly
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // First check localStorage
    const storedSession = getStoredSession();
    if (storedSession?.access_token) {
      return storedSession.access_token;
    }
    
    // Fallback to getting from session
    const session = await getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Listen for auth state changes and update localStorage accordingly
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    if (event === 'SIGNED_OUT') {
      clearSession();
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      storeSession(session);
    }
    
    callback(session?.user || null);
  });
} 