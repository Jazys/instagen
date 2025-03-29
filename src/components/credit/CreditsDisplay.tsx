import React, { useState } from 'react';
import useCreditsHook from '@/hooks/useCredits';
import { UsageLog } from '@/hooks/useCredits';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface CreditsDisplayProps {
  showUsageLogs?: boolean;
}

/**
 * Component to display user's credits and provide a way to use them
 */
export default function CreditsDisplay({ showUsageLogs = true }: CreditsDisplayProps) {
  const { 
    creditsRemaining, 
    formattedNextReset, 
    isLoading, 
    error, 
    useCredits, 
    refreshQuota,
    usageLogs 
  } = useCreditsHook(showUsageLogs);
  
  const [actionType, setActionType] = useState('generate-image');
  const [creditsToUse, setCreditsToUse] = useState(1);
  const [actionStatus, setActionStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });
  const [creatingQuota, setCreatingQuota] = useState(false);

  /**
   * Handle the use of credits
   */
  const handleUseCredits = async () => {
    setActionStatus({ loading: true });
    
    try {
      const success = await useCredits(actionType, creditsToUse);
      
      if (success) {
        setActionStatus({
          loading: false,
          success: true,
          message: `Successfully used ${creditsToUse} credits for ${actionType}`
        });
      } else {
        setActionStatus({
          loading: false,
          success: false,
          message: 'Failed to use credits. You may not have enough credits remaining.'
        });
      }
    } catch (error) {
      setActionStatus({
        loading: false,
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  const handleRefresh = () => {
    refreshQuota();
    setActionStatus({ loading: false });
  };

  /**
   * Create quota record for the user if it doesn't exist
   */
  const createUserQuota = async () => {
    setCreatingQuota(true);
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // First check if quota already exists to avoid duplicates
      const { data: existing } = await supabase
        .from('user_quotas')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        // Just refresh if it exists
        await refreshQuota();
        setActionStatus({
          loading: false,
          success: true,
          message: 'Your quota already exists. Refreshed data.'
        });
      } else {
        // Create new quota for the user
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        
        const { error } = await supabase
          .from('user_quotas')
          .insert({
            user_id: user.id,
            credits_remaining: 100,
            last_reset_date: now.toISOString(),
            next_reset_date: nextMonth.toISOString(),
          });
        
        if (error) {
          throw new Error(`Failed to create quota: ${error.message}`);
        }
        
        await refreshQuota();
        setActionStatus({
          loading: false,
          success: true,
          message: 'Successfully created your credits quota.'
        });
      }
    } catch (error) {
      console.error('Error creating quota:', error);
      setActionStatus({
        loading: false,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create quota'
      });
    } finally {
      setCreatingQuota(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 border rounded-md">Loading credits information...</div>;
  }

  // Check if quota doesn't exist and offer to create it
  if (error && error.includes("quota")) {
    return (
      <div className="p-4 border rounded-md bg-amber-50">
        <h3 className="text-lg font-medium text-amber-800">Credits Not Found</h3>
        <p className="text-amber-700 mb-4">
          It looks like your credits quota hasn't been set up yet. This might happen if your user account was created before the credits system was implemented.
        </p>
        <button 
          className="px-4 py-2 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 disabled:opacity-50"
          onClick={createUserQuota}
          disabled={creatingQuota}
        >
          {creatingQuota ? 'Setting up...' : 'Setup Credits Quota'}
        </button>
        {actionStatus.message && (
          <div className={`mt-2 p-2 rounded-md ${actionStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {actionStatus.message}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-md bg-red-50">
        <h3 className="text-lg font-medium text-red-800">Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
          onClick={handleRefresh}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Your Credits</h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Refresh
          </button>   
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="text-3xl font-bold">{creditsRemaining}</div>
          <div className="text-sm text-gray-500">credits remaining</div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Next Reset</div>
          <div className="text-gray-600">{formattedNextReset}</div>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-2">Use Credits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="generate-image">Generate Image</option>
              <option value="process-file">Process File</option>
              <option value="send-notification">Send Notification</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credits to Use
            </label>
            <input
              type="number"
              min="1"
              max={creditsRemaining}
              value={creditsToUse}
              onChange={(e) => setCreditsToUse(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <button
          onClick={handleUseCredits}
          disabled={actionStatus.loading || creditsRemaining < creditsToUse}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
        >
          {actionStatus.loading ? 'Processing...' : `Use ${creditsToUse} Credit${creditsToUse !== 1 ? 's' : ''}`}
        </button>
        
        {actionStatus.message && (
          <div className={`mt-2 p-2 rounded-md ${actionStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {actionStatus.message}
          </div>
        )}
      </div>
      
      {showUsageLogs && usageLogs.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-right">Credits Used</th>
                  <th className="px-4 py-2 text-right">Remaining</th>
                  <th className="px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.map((log: UsageLog) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2">{log.actionType}</td>
                    <td className="px-4 py-2 text-right">{log.creditsUsed}</td>
                    <td className="px-4 py-2 text-right">{log.creditsRemaining}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 