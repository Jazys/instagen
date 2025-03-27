import { supabase } from './supabase';
import { Database } from './database.types';

export type UserQuota = Database['public']['Tables']['user_quotas']['Row'];
export type CreditUsageLog = Database['public']['Tables']['credits_usage_logs']['Row'];

/**
 * Response from using credits
 */
export interface UseCreditsResponse {
  success: boolean;
  credits_used?: number;
  credits_remaining: number;
  credits_required?: number;
  next_reset_date: string;
  message?: string;
}

/**
 * Service for managing user credits
 */
export class CreditsService {
  /**
   * Get the current quota for a user
   * @param userId - The ID of the user
   * @returns The user's quota information or null if not found
   */
  static async getUserQuota(userId: string): Promise<UserQuota | null> {
    try {
      // Trigger a check for reset by updating the updated_at field
      await supabase
        .from('user_quotas')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      
      // Get the quota after potential reset
      const { data, error } = await supabase
        .from('user_quotas')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user quota:', error.message);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getUserQuota:', error);
      return null;
    }
  }
  
  /**
   * Use credits from a user's quota for a specific action
   * @param userId - The ID of the user
   * @param actionType - The type of action being performed
   * @param creditsToUse - The number of credits to use
   * @returns Response indicating success or failure with details
   */
  static async useCredits(
    userId: string, 
    actionType: string, 
    creditsToUse: number
  ): Promise<UseCreditsResponse> {
    try {
      // Call the Postgres function to use credits
      const { data, error } = await supabase
        .rpc('use_credits', {
          p_user_id: userId,
          p_action_type: actionType,
          p_credits_to_use: creditsToUse
        });
      
      if (error) {
        console.error('Error using credits:', error.message);
        throw new Error(`Failed to use credits: ${error.message}`);
      }
      
      return data as UseCreditsResponse;
    } catch (error) {
      console.error('Error in useCredits:', error);
      throw error;
    }
  }
  
  /**
   * Get credit usage logs for a user
   * @param userId - The ID of the user
   * @param limit - Maximum number of logs to return (default: 10)
   * @returns Array of credit usage logs
   */
  static async getCreditUsageLogs(
    userId: string, 
    limit = 10
  ): Promise<CreditUsageLog[]> {
    try {
      const { data, error } = await supabase
        .from('credits_usage_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching credit usage logs:', error.message);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error in getCreditUsageLogs:', error);
      return [];
    }
  }
} 