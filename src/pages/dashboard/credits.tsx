import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import CreditsDisplay from '@/components/CreditsDisplay';
import Head from 'next/head';
import { getUser, getSession } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import CreditActionButton from '@/components/credit-action-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Define credit packs
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

export default function CreditsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getUser();
        if (!user) {
          toast({
            title: "Authentication Error",
            description: "Please sign in to access this page",
            variant: "destructive",
          });
          router.push('/auth/login');
          return;
        }
        setUserId(user.id);
        setLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        toast({
          title: "Error",
          description: "An error occurred while checking authentication",
          variant: "destructive",
        });
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router, toast]);

  const handleBuyCredits = async (packSize: string) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to purchase credits",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(packSize);
    
    try {
      // Get the current auth token
      const session = await getSession();
      if (!session) {
        throw new Error('Your session has expired. Please log in again.');
      }
      
      // Also store the pack details in localStorage as a fallback
      localStorage.setItem('last_credit_purchase', JSON.stringify({
        packSize,
        userId,
        timestamp: new Date().toISOString()
      }));
      
      // Create success and cancel URLs with pack information
      const successUrl = `${window.location.origin}/dashboard/credits?success=true&pack=${packSize}&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/dashboard/credits?canceled=true`;
      
      // Call the Stripe API to create a checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          packSize, 
          userId,
          successUrl,
          cancelUrl
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }
      
      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }
      
      if (data.url) {
        // Redirect to the Stripe hosted checkout page
        window.location.href = data.url;
      } else {
        // Use the redirect method as fallback
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        
        if (error) {
          throw error;
        }
      }
    } catch (err) {
      console.error('Error initiating checkout:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  // Function to check credit balance and update UI
  const checkCreditBalance = async (expectedCredits: number = 0) => {
    try {
      const session = await getSession();
      if (!session) {
        console.error('No session available for credit check');
        return null;
      }
      
      const response = await fetch('/api/credits/check-balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Current credit balance:', data);
        
        // If we're expecting a certain balance after payment
        if (expectedCredits > 0 && data.credits < expectedCredits) {
          console.log(`Credits not yet updated. Current: ${data.credits}, Expected: ${expectedCredits}`);
          return false;
        }
        
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error checking credit balance:', err);
      return null;
    }
  };
  
  // Enhanced payment status monitoring with retry
  const monitorPaymentCompletion = async (sessionId: string, packSize: string) => {
    let retries = 0;
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    
    // Determine expected credits based on pack size
    let expectedCredits = 0;
    
    if (packSize === 'small') {
      // Fetch current balance and add 100
      const currentData = await checkCreditBalance();
      expectedCredits = (currentData?.credits || 0) + 100;
    } else if (packSize === 'medium') {
      const currentData = await checkCreditBalance();
      expectedCredits = (currentData?.credits || 0) + 300;
    } else if (packSize === 'large') {
      const currentData = await checkCreditBalance();
      expectedCredits = (currentData?.credits || 0) + 1000;
    }
    
    console.log(`Monitoring credit update. Expecting total of ${expectedCredits} credits`);
    
    const checkCreditsWithRetry = async () => {
      if (retries >= maxRetries) {
        console.log('Max retries reached, attempting manual update');
        // Try manual update as last resort
        await updateCreditsManually(sessionId, packSize);
        return;
      }
      
      retries++;
      console.log(`Checking credits update (attempt ${retries}/${maxRetries})...`);
      
      const updated = await checkCreditBalance(expectedCredits);
      if (updated === false) {
        // Credits not yet updated, retry after delay
        console.log(`Credits not yet updated, retrying in ${retryDelay/1000} seconds...`);
        setTimeout(checkCreditsWithRetry, retryDelay);
      } else if (updated) {
        console.log('Credits updated successfully!');
        // Refresh the page to show updated credits
        window.location.reload();
      } else {
        // Error checking, retry
        console.log('Error checking credit update, retrying...');
        setTimeout(checkCreditsWithRetry, retryDelay);
      }
    };
    
    // Start the retry process
    setTimeout(checkCreditsWithRetry, retryDelay);
  };
  
  // Last resort: manual credit update
  const updateCreditsManually = async (sessionId: string, packSize: string) => {
    try {
      const session = await getSession();
      if (!session) {
        console.error('No session available for manual credit update');
        toast({
          title: "Authentication Issue",
          description: "Please refresh and log in again to see your updated credits.",
          variant: "destructive",
        });
        return;
      }
      
      let creditsToAdd = 100; // Default
      if (packSize === 'medium') creditsToAdd = 300;
      if (packSize === 'large') creditsToAdd = 1000;
      
      console.log(`Attempting manual credit update: ${creditsToAdd} credits`);
      
      const response = await fetch('/api/credits/update-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          creditsToAdd,
          paymentId: sessionId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Manual credit update successful:', data);
        toast({
          title: "Credits Updated",
          description: `${creditsToAdd} credits have been added to your account.`,
        });
        
        // Refresh the page to show updated credits
        window.location.reload();
      } else {
        console.error('Manual credit update failed:', await response.text());
        toast({
          title: "Update Failed",
          description: "There was an issue updating your credits. Please contact support with your payment ID.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error in manual credit update:', err);
    }
  };

  // Check for success/canceled query params from Stripe redirect
  useEffect(() => {
    const handlePaymentStatus = async () => {
      if (router.query.success === 'true') {
        toast({
          title: "Payment Successful!",
          description: "Processing your credit purchase...",
        });
        
        // If session_id is provided in the URL, we can use it to verify and update credits if needed
        const sessionId = router.query.session_id as string;
        // Get packSize from URL if available, or from localStorage if we stored it before redirecting
        const packSize = (router.query.pack as string) || 'small';
        
        if (sessionId) {
          try {
            console.log(`Processing payment success for session ${sessionId} and pack ${packSize}`);
            
            // Store these details in localStorage as a backup
            localStorage.setItem('last_successful_payment', JSON.stringify({
              sessionId,
              packSize,
              userId,
              timestamp: new Date().toISOString()
            }));
            
            // Start monitoring for credit update
            if (userId) {
              monitorPaymentCompletion(sessionId, packSize);
            } else {
              // If no user ID yet, store this in localStorage and handle when user is authenticated
              console.log('User ID not available yet, storing payment info for later processing');
            }
          } catch (err) {
            console.error('Error handling payment success:', err);
          }
        } else {
          console.error('No session ID provided in success URL');
        }
        
        // Clear the query parameters after handling
        router.replace('/dashboard/credits', undefined, { shallow: true });
      } else if (router.query.canceled === 'true') {
        toast({
          title: "Payment Canceled",
          description: "Your credit purchase was canceled.",
          variant: "destructive",
        });
        
        // Clear the query parameters after handling
        router.replace('/dashboard/credits', undefined, { shallow: true });
      }
    };
    
    if (router.query.success || router.query.canceled) {
      handlePaymentStatus();
    }
  }, [router.query, toast, userId, router]);

  // Check for pending payments on page load
  useEffect(() => {
    const checkPendingPayments = async () => {
      if (!userId) return;
      
      try {
        // Check if we have a stored successful payment that might need processing
        const storedPayment = localStorage.getItem('last_successful_payment');
        if (storedPayment) {
          const paymentData = JSON.parse(storedPayment);
          
          // Only process if it's recent (last 24 hours)
          const paymentTime = new Date(paymentData.timestamp);
          const now = new Date();
          const hoursSincePayment = (now.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSincePayment < 24 && paymentData.sessionId) {
            console.log('Found recent unprocessed payment, checking status:', paymentData);
            
            // First check if credits are already updated
            const currentData = await checkCreditBalance();
            
            // Determine expected credits
            let additionalCredits = 100;
            if (paymentData.packSize === 'medium') additionalCredits = 300;
            if (paymentData.packSize === 'large') additionalCredits = 1000;
            
            // If credits seem low, try to process the payment
            if (currentData && currentData.credits < additionalCredits) {
              console.log('Credits may need updating, attempting to process payment');
              monitorPaymentCompletion(paymentData.sessionId, paymentData.packSize);
            } else {
              console.log('Credits appear to be already updated, clearing stored payment');
              localStorage.removeItem('last_successful_payment');
            }
          } else if (hoursSincePayment >= 24) {
            // Clear old payment data
            localStorage.removeItem('last_successful_payment');
          }
        }
      } catch (err) {
        console.error('Error checking pending payments:', err);
      }
    };
    
    checkPendingPayments();
  }, [userId]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... - Instagen</title>
        </Head>
        <Navbar />
        <main className="pt-24 min-h-screen">
          <div className="container flex items-center justify-center">
            <p>Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Your Credits - Instagen</title>
        <meta name="description" content="Manage your monthly credits" />
      </Head>

      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Credits & Billing</h1>
          
          
          <CreditsDisplay showUsageLogs={true} />
          
          {/* Credit Purchase Section */}
          <div className="mt-10 p-6 bg-white rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold mb-4">Purchase Additional Credits</h2>
            <p className="text-gray-700 mb-6">
              Need more credits? Choose a credit package below to enhance your capabilities.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
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
                  <Button
                    onClick={() => handleBuyCredits(pack.id)}
                    disabled={isProcessing !== null}
                    className={`
                      w-full py-2 rounded-lg font-medium
                      ${isProcessing === pack.id ? 'bg-gray-400 cursor-not-allowed' : 
                        pack.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 
                        'bg-gray-100 hover:bg-gray-200 text-gray-800'}
                    `}
                  >
                    {isProcessing === pack.id ? 'Processing...' : 'Buy Now'}
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
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
          
          <div className="mt-10 p-6 bg-white rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold mb-4">How Credits Work</h2>
            <div className="space-y-4">
              <p>
                Your account is allocated <strong>100 credits</strong> at the beginning of each month.
                These credits allow you to perform various actions on our platform:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Generate Image</strong> - 1 credit per standard image</li>
                <li><strong>Process File</strong> - 2 credits per file</li>
                <li><strong>Send Notification</strong> - 1 credit per 10 notifications</li>
              </ul>
              
              <p>
                Credits reset automatically on the 1st day of each month. Unused credits do not
                roll over to the next month.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Need More Credits?</h3>
                <p className="text-blue-700">
                  If you need more credits immediately, purchase one of our credit packs above.
                  For consistent higher usage, consider upgrading to our Pro or Enterprise plans.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 