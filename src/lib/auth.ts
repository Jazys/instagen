import { supabase } from './supabase'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export async function getUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    callback(session?.user || null)
  })
} 