import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [isVerifying, setIsVerifying] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    credits: number;
    amount: number;
  } | null>(null);

  // Properly check authentication using both methods
  useEffect(() => {
    async function checkAuth() {
      try {
        console.log('Checking authentication...');
        
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;
        
        // First try using Supabase's getSession
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          console.log('Session found via getSession');
          setUserId(session.user.id);
          setIsCheckingAuth(false);
          return;
        }
        
        // If no session, try refreshing
        console.log('No session found, trying refresh...');
        
        try {
          // Try to refresh the session if possible
          const { error } = await supabase.auth.refreshSession();
          
          // Check if refreshing worked
          const { data: { session: refreshedSession } } = await supabase.auth.getSession();
          
          if (refreshedSession && refreshedSession.user) {
            console.log('Session refreshed successfully');
            setUserId(refreshedSession.user.id);
            setIsCheckingAuth(false);
            return;
          }
          
          // Fallback: directly parse localStorage
          console.log('Still no session, directly checking localStorage...');
          const authData = localStorage.getItem('supabase.auth.token');
          
          if (authData) {
            const parsedAuth = JSON.parse(authData);
            const storedUserId = parsedAuth?.currentSession?.user?.id;
            
            if (storedUserId) {
              console.log('Found user ID in localStorage:', storedUserId);
              setUserId(storedUserId);
              setIsCheckingAuth(false);
              return;
            }
          }
          
          // No authentication found
          console.log('No authentication found');
          setError('Please log in to verify your payment');
          setIsCheckingAuth(false);
        } catch (err) {
          console.error('Error checking localStorage auth:', err);
          setError('Authentication error. Please try logging in again.');
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Authentication error. Please try logging in again.');
        setIsCheckingAuth(false);
      }
    }
    
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Helper function to get access token - try multiple sources
  const getAccessToken = async () => {
    try {
      // First try from the session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return session.access_token;
      }
      
      // Fallback to localStorage
      const authData = localStorage.getItem('supabase.auth.token');
      if (authData) {
        const parsedAuth = JSON.parse(authData);
        return parsedAuth?.currentSession?.access_token;
      }
      
      return null;
    } catch (err) {
      console.error('Error getting access token:', err);
      return null;
    }
  };

  // Verify payment once auth is checked and session_id is available
  useEffect(() => {
    async function verifyPayment() {
      if (!session_id || isCheckingAuth || !userId) return;
      
      try {
        const accessToken = await getAccessToken();
        const response = await fetch(`/api/stripe/verify-payment?session_id=${session_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Payment verification failed');
        }
        
        setPaymentInfo(data);
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsVerifying(false);
      }
    }

    if (!isCheckingAuth && userId) {
      verifyPayment();
    } else if (!isCheckingAuth && !userId) {
      setIsVerifying(false);
    }
  }, [session_id, isCheckingAuth, userId]);

  if (isCheckingAuth) {
    return (
      <>
        <Head>
          <title>Loading... - Instagen</title>
        </Head>
        <Navbar />
        <main className="pt-24 min-h-screen">
          <div className="container flex items-center justify-center">
            <p>Checking authentication...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Payment Verification - Instagen</title>
        <meta name="description" content="Verifying your payment" />
      </Head>

      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <div className="text-center">
              {isVerifying ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-blue-100">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Verifying your payment...</h1>
                  <p className="text-gray-500">
                    This will only take a moment. Please do not close this page.
                  </p>
                </>
              ) : error ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
                  <p className="text-red-500 mb-6">{error}</p>
                  
                  {!userId && (
                    <div className="mb-6">
                      <p className="mb-4">You need to be logged in to verify your payment.</p>
                      <button 
                        onClick={() => window.location.href = `/auth/login?redirect=${encodeURIComponent('/credits/success?session_id=' + session_id)}`}
                        className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      >
                        Log In
                      </button>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      onClick={() => window.location.href = '/credits/buy'}
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
                  <p className="text-gray-500 mb-6">
                    Your payment has been processed and your credits have been added to your account.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-bold">€{(paymentInfo?.amount || 0) / 100}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Credits Added:</span>
                      <span className="font-bold">{paymentInfo?.credits || 0} credits</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      onClick={() => window.location.href = '/dashboard/credits'}
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      View My Credits
                    </button>
                    <button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 