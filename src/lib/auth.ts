import { supabase } from './supabase'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export async function getUser(): Promise<User | null> {
  try {
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
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear local storage session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb-auth-token')
    }
    
    // Force a reload to clear any lingering state
    if (typeof window !== 'undefined') {
      window.location.replace('/')
    }
  } catch (error) {
    console.error("Error during sign out:", error)
    throw error
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    console.log("Auth state changed:", event, session?.user?.id || "no user")
    
    if (event === 'SIGNED_OUT') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-auth-token')
      }
    }
    
    callback(session?.user || null)
  })
} 