import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreditActionButton from '@/components/credit/credit-action-button';
import { useSession } from '@/lib/hooks/use-session';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { ToastAction } from '@/components/ui/toast';

export default function CreditActionSection() {
  const { session } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Fetch user's credits
  useEffect(() => {
    async function fetchCredits() {
      if (!session?.user) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_quotas')
          .select('credits_remaining')
          .eq('user_id', session.user.id)
          .single();
          
        if (error) {
          toast({
            title: 'Failed to load credits',
            description: 'We could not retrieve your current credit balance.',
            variant: 'destructive',
          });
          return;
        }
        
        setCredits(data.credits_remaining);
      } catch (err) {
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to the server. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchCredits();
  }, [session, toast]);

  // Update credits display after successful credit usage
  const handleSuccess = (creditsRemaining: number) => {
    setUpdating(true);
    
    // Add a small delay to show the updating state
    setTimeout(() => {
      setCredits(creditsRemaining);
      setUpdating(false);
    }, 500);
  };

  // Handle errors from credit actions
  const handleError = (error: any) => {
    // Check for insufficient credits error (402 Payment Required)
    if (error?.error === 'Insufficient credits' || error?.code === '402') {
      toast({
        title: 'Insufficient Credit Balance',
        description: 'You\'ve run out of credits for this action. Purchase more credits to continue using premium features.',
        variant: 'destructive',
        action: (
          <ToastAction 
            altText="Buy Credits" 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => window.location.href = '/dashboard/credits'}
          >
            Buy Credits
          </ToastAction>
        ),
      });
    }
    // Other error handling can be added here as needed
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Test features using your credits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Available Credits</h3>
              <p className="text-sm text-muted-foreground">Use credits to access premium features</p>
            </div>
            <div className="text-2xl font-bold flex items-center">
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : updating ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                credits !== null ? credits : "N/A"
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <CreditActionButton 
              actionType="content_generation"
              onSuccess={handleSuccess}
              onError={handleError}
              variant="default"
              size="sm"
            >
              Generate Content
            </CreditActionButton>
            
            <CreditActionButton 
              actionType="profile_boost"
              onSuccess={handleSuccess}
              onError={handleError}
              variant="outline"
              size="sm"
            >
              Boost Profile
            </CreditActionButton>
            
            <CreditActionButton 
              actionType="analytics_report"
              onSuccess={handleSuccess}
              onError={handleError}
              variant="secondary"
              size="sm"
            >
              Analytics Report
            </CreditActionButton>
            
            <CreditActionButton 
              actionType="test_action"
              onSuccess={handleSuccess}
              onError={handleError}
              variant="ghost"
              size="sm"
            >
              Test Action
            </CreditActionButton>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Each action uses 1 credit. Visit the credits page to purchase more.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 