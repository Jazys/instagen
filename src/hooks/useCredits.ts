import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface QuotaData {
  creditsRemaining: number;
  nextResetDate: string;
  lastResetDate: string;
  formattedNextReset: string;
  isLoading: boolean;
  error: string | null;
}

export interface UsageLog {
  id: string;
  actionType: string;
  creditsUsed: number;
  creditsRemaining: number;
  timestamp: string;
}

interface UseCreditsResult extends QuotaData {
  useCredits: (actionType: string, credits: number) => Promise<boolean>;
  refreshQuota: () => Promise<void>;
  usageLogs: UsageLog[];
}

/**
 * Hook for managing user credits in the frontend
 * @param fetchLogsOnMount - Whether to fetch usage logs when the component mounts
 * @returns Quota information and functions for using credits
 */
export default function useCredits(fetchLogsOnMount = false): UseCreditsResult {
  const [state, setState] = useState<QuotaData>({
    creditsRemaining: 0,
    nextResetDate: '',
    lastResetDate: '',
    formattedNextReset: '',
    isLoading: true,
    error: null,
  });
  
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);

  /**
   * Format the next reset date in a human-readable format
   */
  const formatNextReset = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  /**
   * Fetch the user's current quota directly from Supabase
   */
  const refreshQuota = useCallback(async (includeLogs = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // First, trigger a potential reset by updating updated_at
      await supabase
        .from('user_quotas')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      
      // Get the user quota
      const { data: quotaData, error: quotaError } = await supabase
        .from('user_quotas')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (quotaError) {
        throw new Error(`Failed to fetch quota: ${quotaError.message}`);
      }
      
      setState({
        creditsRemaining: quotaData.credits_remaining,
        nextResetDate: quotaData.next_reset_date,
        lastResetDate: quotaData.last_reset_date,
        formattedNextReset: formatNextReset(quotaData.next_reset_date),
        isLoading: false,
        error: null,
      });
      
      if (includeLogs) {
        // Get usage logs
        const { data: logsData, error: logsError } = await supabase
          .from('credits_usage_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (logsError) {
          console.error('Error fetching logs:', logsError.message);
        } else if (logsData) {
          setUsageLogs(logsData.map(log => ({
            id: log.id,
            actionType: log.action_type,
            creditsUsed: log.credits_used,
            creditsRemaining: log.credits_remaining,
            timestamp: log.created_at
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching quota:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quota',
      }));
    }
  }, []);

  /**
   * Use credits for a specified action directly through Supabase RPC
   * @param actionType - Type of action being performed
   * @param credits - Number of credits to use
   * @returns True if credits were successfully used, false otherwise
   */
  const useCredits = useCallback(async (
    actionType: string, 
    credits: number
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Use credits through the RPC function
      const { data, error } = await supabase.rpc('use_credits', {
        p_user_id: user.id,
        p_action_type: actionType,
        p_credits_to_use: credits
      });
      
      if (error) {
        throw new Error(`Failed to use credits: ${error.message}`);
      }
      
      if (!data.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Insufficient credits',
        }));
        return false;
      }
      
      // Update local state with new values
      setState({
        creditsRemaining: data.credits_remaining,
        nextResetDate: data.next_reset_date,
        lastResetDate: state.lastResetDate, // Preserve existing value
        formattedNextReset: formatNextReset(data.next_reset_date),
        isLoading: false,
        error: null,
      });
      
      // Refresh usage logs after successful credit usage
      await refreshQuota(true);
      
      return true;
    } catch (error) {
      console.error('Error using credits:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to use credits',
      }));
      return false;
    }
  }, [state.lastResetDate, refreshQuota]);

  // Fetch quota data when component mounts
  useEffect(() => {
    // Check if user is authenticated first
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        refreshQuota(fetchLogsOnMount);
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'User not authenticated',
        }));
      }
    };
    
    checkAuth();
  }, [refreshQuota, fetchLogsOnMount]);

  return {
    ...state,
    useCredits,
    refreshQuota: () => refreshQuota(true),
    usageLogs,
  };
} 