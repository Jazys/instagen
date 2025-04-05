import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [isVerifying, setIsVerifying] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    credits: number;
    amount: number;
  } | null>(null);

  // Check authentication on client side
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError('Authentication error. Please try logging in again.');
      } finally {
        setIsCheckingAuth(false);
      }
    }
    
    checkAuth();
  }, [router]);

  // Verify payment once auth is checked and session_id is available
  useEffect(() => {
    async function verifyPayment() {
      if (!session_id || isCheckingAuth) return;
      
      try {
        const response = await fetch(`/api/stripe/verify-payment?session_id=${session_id}`);
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

    if (!isCheckingAuth) {
      verifyPayment();
    }
  }, [session_id, isCheckingAuth]);

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
        <title>Payment Successful - Instagen</title>
        <meta name="description" content="Your payment was successful" />
      </Head>

      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl border shadow-md overflow-hidden">
            <div className="p-8 text-center">
              {isVerifying ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <h1 className="text-2xl font-bold mb-2">Verifying your payment...</h1>
                  <p className="text-gray-500">
                    Please wait while we confirm your payment.
                  </p>
                </>
              ) : error ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
                  <p className="text-gray-500 mb-6">
                    {error}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/dashboard/credits">
                      <button className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium">
                        View My Credits
                      </button>
                    </Link>
                    <Link href="/dashboard/credits/buy">
                      <button className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
                        Try Again
                      </button>
                    </Link>
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
                    <Link href="/dashboard/credits">
                      <button className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
                        View My Credits
                      </button>
                    </Link>
                    <Link href="/dashboard">
                      <button className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium">
                        Go to Dashboard
                      </button>
                    </Link>
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