import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from '@/lib/hooks/use-session';
import { getSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

// Define ApiError interface for type safety
interface ApiError {
  status: number;
  message?: string;
  error?: string;
}

export type CreditActionButtonProps = {
  actionType?: string;
  onSuccess?: (creditsRemaining: number) => void;
  onError?: (error: any) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
};

export default function CreditActionButton({
  actionType = 'test_action',
  onSuccess,
  onError,
  variant = 'default',
  size = 'default',
  className = '',
  children = 'Use 1 Credit',
}: CreditActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const handleClick = async () => {
    // Start loading state
    setIsLoading(true);
    
    try {
      // First, refresh the session token to ensure we have a valid one
      const freshSession = await getSession();
      
      if (!freshSession) {
        toast({
          title: 'Authentication Required',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
        if (onError) onError({ error: 'Authentication failed' });
        return;
      }
      
      console.log(`Executing ${actionType} action with refreshed token`);
      
      // Make the API call with the fresh token
      const response = await fetch('/api/credits/use-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession.access_token}`,
        },
        body: JSON.stringify({
          actionType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different error types
        if (response.status === 402) {
          // Payment Required - Insufficient credits
          toast({
            title: 'Insufficient Credit Balance',
            description: 'You\'ve run out of credits for this action. Purchase more credits to continue using premium features.',
            variant: 'destructive',
            action: (
              <ToastAction 
                altText="Buy Credits" 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => router.push('/dashboard/credits')}
              >
                Buy Credits
              </ToastAction>
            ),
          });
        } else if (response.status === 401) {
          // Authentication error
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
        } else {
          // Generic error
          toast({
            title: 'Action Failed',
            description: data.error || 'There was an error processing your request',
            variant: 'destructive',
          });
        }
        
        if (onError) onError(data);
      } else {
        // Success
        toast({
          title: 'Success',
          description: `Action completed! You have ${data.credits_remaining} credits remaining.`,
        });
        if (onSuccess) onSuccess(data.credits_remaining);
      }
    } catch (error) {
      console.error('Error using credit:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to the server. Please check your internet connection.',
        variant: 'destructive',
      });
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = async (error: ApiError) => {
    setIsLoading(false);
    console.error('Credit action error:', error);

    // Handle different error types
    if (error.status === 402) {
      toast({
        title: "Insufficient Credit Balance",
        description: "You've run out of credits for this action. Purchase more credits to continue using premium features.",
        variant: "destructive",
        action: (
          <ToastAction 
            altText="Buy Credits" 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => router.push('/dashboard/credits')}
          >
            Buy Credits
          </ToastAction>
        ),
      });
    } else if (error.status === 401) {
      // Try to refresh the token
      try {
        await getSession();
        toast({
          title: "Session Refreshed",
          description: "Your session has been refreshed. Please try again.",
        });
      } catch (refreshError) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again later.",
        variant: "destructive",
      });
    }

    if (onError) {
      onError(error);
    }
  };

  // Don't show button if session is still loading
  if (sessionLoading) {
    return (
      <Button
        disabled
        variant={variant}
        size={size}
        className={className}
      >
        Loading...
      </Button>
    );
  }

  // Don't allow interaction if no session exists
  if (!session) {
    return (
      <Button
        onClick={() => {
          toast({
            title: 'Authentication Required',
            description: 'Please log in to use credits',
            variant: 'destructive',
          });
        }}
        variant={variant}
        size={size}
        className={className}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? 'Processing...' : children}
    </Button>
  );
} 