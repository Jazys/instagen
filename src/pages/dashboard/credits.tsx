import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import CreditsDisplay from '@/components/credit/CreditsDisplay';
import Head from 'next/head';
import { getUser, getSession } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';


// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Define credit packs
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

export default function CreditsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [paymentHandled, setPaymentHandled] = useState(false);
  const processedPaymentRef = useRef<string | null>(null);

  // Add state for manual payment processing UI
  const [pendingPaymentDetails, setPendingPaymentDetails] = useState<{
    sessionId: string;
    packSize: string;
    processingFailed: boolean;
  } | null>(null);

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
      
      // Check and save the current balance BEFORE initiating payment
      const currentBalanceData = await checkCreditBalance();
      const prePaymentBalance = currentBalanceData?.credits || 0;
      
      // Also store the pack details in localStorage as a fallback
      localStorage.setItem('last_credit_purchase', JSON.stringify({
        packSize,
        userId,
        prePaymentBalance,
        timestamp: new Date().toISOString()
      }));
      
      // Create success and cancel URLs with pack information
      const successUrl = `${window.location.origin}/dashboard/credits?success=true&pack=${packSize}&session_id={CHECKOUT_SESSION_ID}&pre_balance=${prePaymentBalance}`;
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
          prePaymentBalance,
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
  const monitorPaymentCompletion = async (sessionId: string, packSize: string, prePaymentBalance?: number) => {
    // Skip if already monitoring this session
    /*if (processedPaymentRef.current === sessionId) {
      console.log('Already monitoring this payment session, skipping duplicate call');
      return;
    }*/
    
    // Set this session as being processed
    processedPaymentRef.current = sessionId;
    
    let retries = 0;
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    let isMonitoring = true;
    
    // Determine expected credits based on pack size
    let expectedCredits = 0;
    
    try {
      // Use pre-payment balance if provided, otherwise fetch current balance
      let baseCredits = prePaymentBalance || 0; // Default to 0 if undefined
      
      if (baseCredits === 0 && prePaymentBalance === undefined) {
        // Fallback to fetching current balance if pre-payment balance not provided
        const currentData = await checkCreditBalance();
        baseCredits = currentData?.credits || 0;
        console.log('Pre-payment balance not provided, using current balance:', baseCredits);
      } else {
        console.log('Using pre-payment balance:', baseCredits);
      }
      
      if (packSize === 'small') {
        expectedCredits = baseCredits + 100;
      } else if (packSize === 'medium') {
        expectedCredits = baseCredits + 300;
      } else if (packSize === 'large') {
        expectedCredits = baseCredits + 1000;
      }
      
      console.log(`Monitoring credit update. Base: ${baseCredits}, Expecting total of ${expectedCredits} credits`);
      
      const checkCreditsWithRetry = async () => {
        if (!isMonitoring) return;
        
        if (retries >= maxRetries) {
          console.log('Max retries reached, showing manual update option');
          // Show manual update option to the user
          setPendingPaymentDetails({
            sessionId,
            packSize,
            processingFailed: true
          });
          return;
        }
        
        retries++;
        console.log(`Checking credits update (attempt ${retries}/${maxRetries})...`);
        
        try {
          const updated = await checkCreditBalance(expectedCredits);
          if (updated === false) {
            // Credits not yet updated, retry after delay
            console.log(`Credits not yet updated, retrying in ${retryDelay/1000} seconds...`);
            
            // If we're on the last retry, start showing the manual update option
            if (retries === maxRetries - 1) {
              setPendingPaymentDetails({
                sessionId,
                packSize,
                processingFailed: false
              });
            }
            
            setTimeout(checkCreditsWithRetry, retryDelay);
          } else if (updated) {
            console.log('Credits updated successfully!');
            isMonitoring = false;
            setPendingPaymentDetails(null);
            // Refresh the page to show updated credits
            // Use location.href instead of reload for a clean page load
            //need pour rafraichir les credit ??
            window.location.href = '/dashboard/credits';
          } else {
            // Error checking, retry
            console.log('Error checking credit update, retrying...');
            setTimeout(checkCreditsWithRetry, retryDelay);
          }
        } catch (err) {
          console.error('Error during credit check retry:', err);
          // Still retry despite the error
          setTimeout(checkCreditsWithRetry, retryDelay);
        }
      };
      
      // Start the retry process
      setTimeout(checkCreditsWithRetry, retryDelay);
    } catch (err) {
      console.error('Error setting up credit monitoring:', err);
    }
    
    // Return a cleanup function
    return () => {
      console.log('Cleaning up credit monitoring');
      isMonitoring = false;
    };
  };
  
  // Function to handle manual update request
  const handleManualUpdate = async (force = false) => {
    if (!pendingPaymentDetails) return;
    
    try {
      await updateCreditsManually(
        pendingPaymentDetails.sessionId,
        pendingPaymentDetails.packSize,
        force
      );
    } catch (err) {
      console.error('Error during manual update:', err);
      toast({
        title: "Error",
        description: "Failed to manually update credits. Please contact support.",
        variant: "destructive",
      });
    }
  };
  
  // Last resort: manual credit update
  const updateCreditsManually = async (sessionId: string, packSize: string, forceUpdate = false) => {
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
      
      // Check if we've already tried this payment ID
      const processedPayments = localStorage.getItem('processed_payments');
      const processedIds = processedPayments ? JSON.parse(processedPayments) : [];
      
      if (processedIds.includes(sessionId) && !forceUpdate) {
        console.log('This payment has already been processed manually, skipping');
        toast({
          title: "Already Processed",
          description: "This payment has already been processed. Refreshing page to show updated credits.",
        });
        
        // Navigate instead of reload
        window.location.href = '/dashboard/credits';
        return;
      }

      // Verify with Stripe before crediting (to ensure the payment was actually successful)
      const verifyResponse = await fetch(`/api/stripe/verify-payment?session_id=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!verifyResponse.ok && !forceUpdate) {
        console.error('Payment verification failed:', await verifyResponse.text());
        toast({
          title: "Verification Failed",
          description: "We couldn't verify this payment with Stripe. Please contact support with your payment ID.",
          variant: "destructive",
        });
        return;
      }
      
      // If verification succeeded or force update is enabled, proceed with the update
      const response = await fetch('/api/credits/update-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          creditsToAdd,
          paymentId: sessionId,
          forceUpdate: forceUpdate,  // Send this flag to the API for logging
          verificationStatus: verifyResponse.ok ? 'verified' : 'bypassed'
        }),
      });
      
      if (response.ok) {
        // Store this payment ID as processed
        if (!processedIds.includes(sessionId)) {
          processedIds.push(sessionId);
          localStorage.setItem('processed_payments', JSON.stringify(processedIds));
        }
        
        // Remove from pending payments
        localStorage.removeItem('last_successful_payment');
        
        const data = await response.json();
        console.log('Manual credit update successful:', data);
        toast({
          title: "Credits Updated",
          description: `${creditsToAdd} credits have been added to your account.`,
        });
        
        // Navigate to credits page after short delay
        setTimeout(() => {
          window.location.href = '/dashboard/credits';
        }, 1000);
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
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating your credits.",
        variant: "destructive",
      });
    }
  };

  // Check for success/canceled query params from Stripe redirect
  useEffect(() => {
    const handlePaymentStatus = async () => {
      // Skip if we've already handled this payment session
      const sessionId = router.query.session_id as string;
      if (paymentHandled || (sessionId && processedPaymentRef.current === sessionId)) {
        return;
      }

      if (router.query.success === 'true' && sessionId) {
        // Mark this payment as handled
        setPaymentHandled(true);
        processedPaymentRef.current = sessionId;
        
        toast({
          title: "Payment Successful!",
          description: "Processing your credit purchase...",
        });
        
        // Get packSize from URL if available, or from localStorage if we stored it before redirecting
        const packSize = (router.query.pack as string) || 'small';
        
        // Get pre-payment balance from query params
        const prePaymentBalance = parseInt(router.query.pre_balance as string, 10) || 0;
        
        try {
          console.log(`Processing payment success for session ${sessionId} and pack ${packSize}`);
          
          // Store these details in localStorage as a backup
          localStorage.setItem('last_successful_payment', JSON.stringify({
            sessionId,
            packSize,
            userId,
            prePaymentBalance,
            timestamp: new Date().toISOString()
          }));
          
          // Start monitoring for credit update
          if (userId) {
            monitorPaymentCompletion(sessionId, packSize, prePaymentBalance);
          } else {
            // If no user ID yet, store this in localStorage and handle when user is authenticated
            console.log('User ID not available yet, storing payment info for later processing');
          }
        } catch (err) {
          console.error('Error handling payment success:', err);
        }
        
        // Only clear the query parameters after we've handled everything
        // Use setTimeout to avoid immediate state updates that could trigger re-renders
        setTimeout(() => {
          router.replace('/dashboard/credits', undefined, { shallow: true });
        }, 100);
      } else if (router.query.canceled === 'true') {
        setPaymentHandled(true);
        
        toast({
          title: "Payment Canceled",
          description: "Your credit purchase was canceled.",
          variant: "destructive",
        });
        
        // Clear the query parameters after handling
        setTimeout(() => {
          router.replace('/dashboard/credits', undefined, { shallow: true });
        }, 100);
      }
    };
    
    if ((router.query.success || router.query.canceled) && !paymentHandled) {
      handlePaymentStatus();
    }
  }, [router.query, toast, userId, router, monitorPaymentCompletion, paymentHandled]);

  // Check for pending payments on page load
  useEffect(() => {
    const checkPendingPayments = async () => {
      if (!userId || paymentHandled) return;
      
      try {
        // Check if we have a stored successful payment that might need processing
        const storedPayment = localStorage.getItem('last_successful_payment');
        if (storedPayment) {
          const paymentData = JSON.parse(storedPayment);
          
          // Skip if we've already processed this payment
          if (processedPaymentRef.current === paymentData.sessionId) {
            return;
          }
          
          // Only process if it's recent (last 24 hours)
          const paymentTime = new Date(paymentData.timestamp);
          const now = new Date();
          const hoursSincePayment = (now.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSincePayment < 24 && paymentData.sessionId) {
            console.log('Found recent unprocessed payment, checking status:', paymentData);
            
            // Mark this payment as being handled
            processedPaymentRef.current = paymentData.sessionId;
            
            // First check if credits are already updated
            const currentData = await checkCreditBalance();
            
            // Use stored pre-payment balance if available
            const baseCredits = paymentData.prePaymentBalance !== undefined ? 
              paymentData.prePaymentBalance : (currentData?.credits || 0);
            
            // Determine expected credits
            let additionalCredits = 100;
            if (paymentData.packSize === 'medium') additionalCredits = 300;
            if (paymentData.packSize === 'large') additionalCredits = 1000;
            
            const expectedCredits = baseCredits + additionalCredits;
            
            // If credits not yet at expected level, try to process the payment
            if (currentData && currentData.credits < expectedCredits) {
              console.log('Credits may need updating, attempting to process payment');
              monitorPaymentCompletion(paymentData.sessionId, paymentData.packSize, baseCredits);
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
  }, [userId, monitorPaymentCompletion, paymentHandled]);

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
          <h1 className="text-3xl font-bold mb-6">Billing & Credits</h1>         
      
          
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
                    <span className="text-3xl font-extrabold">${pack.price}</span>
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

              
          <CreditsDisplay showUsageLogs={true} />
          
          <div className="mt-10 p-6 bg-white rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold mb-4">How Credits Work</h2>
            <div className="space-y-4">
              <p>
                Your account is allocated <strong>100 credits</strong> at the beginning of each month.
                These credits allow you to perform various actions on our platform:
              </p>
              
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Generate Image</strong> - 20 credit per standard image</li>
              </ul>              
         
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Need More Credits?</h3>
                <p className="text-blue-700">
                  If you need more credits immediately, purchase one of our credit packs above.
                  For consistent higher usage, consider upgrading to our Pro or Enterprise plans.
                </p>
              </div>
            </div>
          </div>
          
          {/* Manual Credit Processing UI */}
          {pendingPaymentDetails && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-amber-800">
                    {pendingPaymentDetails.processingFailed 
                      ? "Payment Processing Failed" 
                      : "Payment Processing In Progress"}
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      {pendingPaymentDetails.processingFailed
                        ? "We're having trouble automatically updating your credits after your payment."
                        : "We're still processing your payment and updating your credits."}
                    </p>
                    
                    <div className="mt-4 flex gap-2">
                      {pendingPaymentDetails.processingFailed ? (
                        <>
                          <button
                            onClick={() => handleManualUpdate(false)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200"
                          >
                            Try Manual Update
                          </button>
                          <button
                            onClick={() => handleManualUpdate(true)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-700 text-white hover:bg-amber-800"
                          >
                            Force Update
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-amber-600">
                          Please wait while we complete this process...
                        </p>
                      )}
                      
                      <button
                        onClick={() => setPendingPaymentDetails(null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
} 