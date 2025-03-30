import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEY, BASE_URL } from '@/lib/auth';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Check if we have a hash fragment or search params which may contain auth info
    const handleAuthCallback = async () => {
      try {
        // The Supabase client will automatically handle the auth redirect
        // by using the detectSessionInUrl option
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
          router.push(`${BASE_URL}/auth/login?error=Could not retrieve session`);
          return;
        }
        
        if (session) {
          // Store session in localStorage for consistency
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
          
          // Redirect to dashboard on successful auth
          router.push(`${BASE_URL}/dashboard`);
        } else {
          // If no session, redirect to login
          router.push(`${BASE_URL}/auth/login`);
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        router.push(`${BASE_URL}/auth/login?error=Authentication error occurred`);
      }
    };

    // Only run the callback handler if URL has auth parameters
    if (window.location.hash || window.location.search.includes('access_token') || window.location.search.includes('error')) {
      handleAuthCallback();
    } else {
      // If no auth params present, just redirect to dashboard or login
      router.push(`${BASE_URL}/dashboard`);
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing authentication...</h2>
        <p>You will be redirected shortly.</p>
      </div>
    </div>
  );
} 