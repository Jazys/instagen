import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { getSession, getAccessToken, STORAGE_KEY } from '@/lib/auth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CREDIT_PACKS = [
  {
    id: 'small',
    name: 'Basic Pack',
    credits: 1000,
    price: 19.99,
    description: 'Perfect for personal use and small projects',
    popular: false,
  },
  {
    id: 'medium',
    name: 'Pro Pack',
    credits: 2000,
    price: 29.99,
    description: 'Great for regular users with more demanding needs',
    popular: true,
  },
  {
    id: 'large',
    name: 'Enterprise Pack',
    credits: 6000,
    price: 59.99,
    description: 'Best value for power users and businesses',
    popular: false,
  },
];

export default function BuyCreditsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Check authentication on client side
  useEffect(() => {
    async function checkAuth() {
      console.log('============= BUY PAGE AUTH CHECK =============');
      console.log('Checking authentication state...');
      
      try {
        // First check if we have auth data in localStorage
        if (typeof window !== 'undefined') {
          const storedSession = localStorage.getItem(STORAGE_KEY);
          console.log('Checking localStorage for session:', storedSession ? 'FOUND' : 'NOT FOUND');
          
          if (storedSession) {
            try {
              const parsedSession = JSON.parse(storedSession);
              if (parsedSession.user && parsedSession.user.id) {
                console.log('User identified from localStorage:', parsedSession.user.id);
                console.log('Session expires at:', parsedSession.expires_at ? 
                  new Date(parsedSession.expires_at * 1000).toISOString() : 'unknown');
                
                // Verify the token hasn't expired
                if (parsedSession.expires_at) {
                  const now = Math.floor(Date.now() / 1000);
                  if (parsedSession.expires_at > now) {
                    console.log('Session from localStorage is valid');
                    setUserId(parsedSession.user.id);
                    
                    // Set the session in Supabase client for consistency
                    if (parsedSession.access_token && parsedSession.refresh_token) {
                      try {
                        await supabase.auth.setSession({
                          access_token: parsedSession.access_token,
                          refresh_token: parsedSession.refresh_token
                        });
                      } catch (err) {
                        console.error('Error setting session in Supabase client:', err);
                        // We can continue even if this fails
                      }
                    }
                    
                    setIsCheckingAuth(false);
                    return;
                  } else {
                    console.log('Session from localStorage has expired, attempting refresh');
                  }
                }
              }
            } catch (e) {
              console.error("Failed to parse stored session:", e);
            }
          }
        }
        
        // Fallback to getSession() if localStorage approach fails
        console.log('Getting session with getSession()...');
        const session = await getSession();
        console.log('Session returned:', session ? 'FOUND' : 'NOT FOUND');
        
        if (session) {
          console.log('User identified:', session.user.id);
          console.log('Session expires at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown');
          setUserId(session.user.id);
        } else {
          console.log('No session found, redirecting to login');
          router.push('/auth/login');
          return;
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError('Authentication error. Please try logging in again.');
      } finally {
        setIsCheckingAuth(false);
        console.log('Auth check complete');
        console.log('============================================');
      }
    }
    
    checkAuth();
  }, [router]);

  const handleBuyCredits = async (packSize: string) => {
    console.log('Buy button clicked for pack:', packSize);
    
    if (!userId) {
      console.log('No userId found, cannot proceed with purchase');
      setError('You must be logged in to purchase credits');
      return;
    }
    
    setIsLoading(packSize);
    setError(null);
    
    try {
      // Get access token for authorization - prioritizes localStorage
      console.log('Retrieving access token from localStorage...');
      let accessToken = null;
      
      // Try localStorage first
      if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem(STORAGE_KEY);
        console.log('LocalStorage session:', storedSession ? 'FOUND' : 'NOT FOUND');
        
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            console.log('Parsed session:', {
              hasAccessToken: !!parsedSession.access_token,
              tokenLength: parsedSession.access_token ? parsedSession.access_token.length : 0,
              userId: parsedSession.user?.id || 'none',
              expiresAt: parsedSession.expires_at ? new Date(parsedSession.expires_at * 1000).toISOString() : 'unknown'
            });
            
            if (parsedSession.access_token) {
              console.log('Access token found in localStorage');
              accessToken = parsedSession.access_token;
            }
          } catch (e) {
            console.error("Failed to parse stored session:", e);
          }
        }
      }
      
      // If not found in localStorage, try getAccessToken
      if (!accessToken) {
        console.log('No token in localStorage, trying getAccessToken()...');
        accessToken = await getAccessToken();
      }
      
      console.log('Access token retrieved:', accessToken ? `YES (length: ${accessToken.length})` : 'NO (token missing)');
      
      if (!accessToken) {
        console.error('No access token available');
        setError('Authentication error. Please try logging in again.');
        return;
      }
      
      // Debug log to check token format before sending
      console.log('Token format check:', {
        first10Chars: accessToken.substring(0, 10) + '...',
        length: accessToken.length,
        containsBearer: accessToken.includes('Bearer')
      });
      
      // Make sure we don't accidentally double-prefix with "Bearer"
      const authHeader = accessToken.startsWith('Bearer ') 
        ? accessToken 
        : `Bearer ${accessToken}`;
      
      console.log('Sending request to create-checkout-session API...');
      console.log('Request details:', {
        url: '/api/stripe/create-checkout-session',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer [HIDDEN]'
        },
        body: {
          packSize,
          userId
        }
      });
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ 
          packSize,
          userId
        }),
      });
      
      console.log('API response status:', response.status);
      console.log('API response headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      const data = await response.json();
      console.log('API response data:', data);
      
      if (!response.ok) {
        console.error('Checkout session error:', data);
        throw new Error(data.message || 'Failed to create checkout session');
      }
      
      // Redirect to Stripe Checkout
      console.log('Preparing Stripe redirect...');
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }
      
      if (data.url) {
        // Redirect to the Stripe hosted checkout page
        console.log('Redirecting to Stripe URL:', data.url.substring(0, 30) + '...');
        window.location.href = data.url;
      } else {
        // Use the deprecated redirect method as fallback
        console.log('Using redirectToCheckout with sessionId:', data.sessionId);
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        
        if (error) {
          console.error('Stripe redirect error:', error);
          throw error;
        }
      }
    } catch (err) {
      console.error('Error initiating checkout:', err);
      console.error('Error details:', err instanceof Error ? err.stack : 'No stack available');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(null);
    }
  };

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
        <title>Buy Credits - Instagen</title>
        <meta name="description" content="Purchase credits for Instagen" />
      </Head>

      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Buy Credits</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Purchase credits to unlock more features and access advanced 
              generation capabilities on our platform.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {CREDIT_PACKS.map((pack) => (
              <div 
                key={pack.id}
                className={`
                  relative overflow-hidden rounded-xl border p-6 
                  ${pack.popular ? 'border-blue-400 shadow-lg' : 'border-gray-200'}
                `}
              >
                {pack.popular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    POPULAR
                  </div>
                )}
                <div className="text-2xl font-bold mb-2">{pack.name}</div>
                <div className="flex items-baseline mb-4">
                  <span className="text-3xl font-extrabold">€{pack.price}</span>
                  <span className="text-gray-500 ml-1">/one-time</span>
                </div>
                <div className="text-lg font-semibold mb-2">
                  {pack.credits} Credits
                </div>
                <p className="text-gray-500 mb-6">
                  {pack.description}
                </p>
                <button
                  onClick={() => handleBuyCredits(pack.id)}
                  disabled={isLoading !== null}
                  className={`
                    w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center
                    ${pack.popular 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
                    ${isLoading === pack.id ? 'opacity-75 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading === pack.id ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm mb-12">
            <h2 className="text-xl font-bold mb-4">How Credits Work</h2>
            <div className="space-y-4">
              <p>
                Credits are used to perform various actions on our platform:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Generate Image</strong> - 1 credit per standard image</li>
                <li><strong>Process File</strong> - 2 credits per file</li>
                <li><strong>Send Notification</strong> - 1 credit per 10 notifications</li>
              </ul>
              
              <p>
                Purchased credits are added to your account immediately after 
                payment and never expire. They stack with your monthly allocation.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">Secure Payment</span>
            </div>
            <p className="text-sm text-gray-600">
              All payments are processed securely through Stripe. We don't store your payment information.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 