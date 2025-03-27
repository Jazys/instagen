import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getUser, getSession } from '@/lib/auth';

const CREDIT_PACKS = [
  {
    id: 'small',
    name: 'Basic Pack',
    credits: 100,
    price: 10,
    description: 'Perfect for personal use and small projects',
    popular: false,
  },
  {
    id: 'medium',
    name: 'Pro Pack',
    credits: 300,
    price: 25,
    description: 'Great for regular users with more demanding needs',
    popular: true,
  },
  {
    id: 'large',
    name: 'Enterprise Pack',
    credits: 1000,
    price: 75,
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check authentication using the auth.ts helper functions
  useEffect(() => {
    async function checkAuth() {
      try {
        console.log('Checking authentication...');
        
        // Skip during server-side rendering
        if (typeof window === 'undefined') return;
        
        // Use the getUser helper from auth.ts
        const user = await getUser();
        
        if (user) {
          console.log('User found:', user.id);
          setUserId(user.id);
          setIsCheckingAuth(false);
          return;
        }
        
        // No user found
        console.log('No authenticated user found');
        setError('Please log in to purchase credits');
        setIsCheckingAuth(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Authentication error. Please try logging in again.');
        setIsCheckingAuth(false);
      }
    }
    
    checkAuth();
  }, []);

  const handleBuyCredits = async (packSize: string) => {
    if (!userId) {
      setError('You must be logged in to purchase credits');
      return;
    }
    
    setIsLoading(packSize);
    setError(null);
    
    try {
      // Get the selected credit pack
      const selectedPack = CREDIT_PACKS.find(pack => pack.id === packSize);
      if (!selectedPack) {
        throw new Error('Invalid pack selection');
      }

      // Check if we have a valid session
      const session = await getSession();
      if (!session) {
        throw new Error('Your session has expired. Please log in again.');
      }

      // Call our API to add credits
      const response = await fetch('/api/credits/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ packSize, userId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add credits');
      }
      
      // Show a success toast notification
      toast.success(`Successfully added ${selectedPack.credits} credits to your account!`);
      
      // Also set the success message for the UI
      setSuccessMessage(`Successfully added ${selectedPack.credits} credits to your account!`);
      
      // Optional: Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
    } catch (err) {
      console.error('Error processing credits purchase:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
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
              {!userId && (
                <div className="mt-4">
                  <button
                    onClick={() => window.location.href = '/auth/login?redirect=' + encodeURIComponent('/credits/buy')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Log In
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              <p className="font-medium">Success!</p>
              <p>{successMessage}</p>
            </div>
          )}

          {userId && (
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
                  <p className="text-gray-600 mb-6">{pack.description}</p>
                  <button
                    onClick={() => handleBuyCredits(pack.id)}
                    disabled={isLoading !== null}
                    className={`
                      w-full py-2 rounded-lg font-medium
                      ${isLoading === pack.id ? 'bg-gray-400 cursor-not-allowed' : pack.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
                    `}
                  >
                    {isLoading === pack.id ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 p-6 rounded-lg border mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">Credit Processing</span>
            </div>
            <p className="text-sm text-gray-600">
              Credits are added directly to your account. No payment processing is required.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 