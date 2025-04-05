import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '../auth';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // Function to load the session using our optimized auth utilities
    async function loadSession() {
      try {
        setLoading(true);
        
        // Use our optimized getSession function that checks localStorage first
        const currentSession = await getSession();
        
        if (mounted) {
          setSession(currentSession);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Load the initial session
    loadSession();

    // Set up auth state change listener
    const { data: authListener } = onAuthStateChange((user) => {
      // When auth state changes, reload the session
      // This is only triggered on sign in/out events
      loadSession();
    });

    // Clean up
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, error };
} 