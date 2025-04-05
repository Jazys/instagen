import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/api-middleware';
import { CreditsService } from '@/lib/credits-service';

/**
 * API route to get user quota information
 * 
 * Response:
 * - creditsRemaining: number - Current credits available
 * - lastResetDate: string - Date when credits were last reset
 * - nextResetDate: string - Date when credits will next reset
 * - usageLogs?: array - Recent credit usage logs (if ?includeLogs=true)
 */
async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user's quota information
    const quota = await CreditsService.getUserQuota(userId);
    
    if (!quota) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'User quota not found' 
      });
    }
    
    // Build response object
    const response: any = {
      creditsRemaining: quota.credits_remaining,
      lastResetDate: quota.last_reset_date,
      nextResetDate: quota.next_reset_date,
    };
    
    // Include usage logs if requested
    const includeLogs = req.query.includeLogs === 'true';
    if (includeLogs) {
      const logs = await CreditsService.getCreditUsageLogs(userId, 10);
      response.usageLogs = logs.map(log => ({
        id: log.id,
        actionType: log.action_type,
        creditsUsed: log.credits_used,
        creditsRemaining: log.credits_remaining,
        timestamp: log.created_at
      }));
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching user quota:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}

export default withAuth(handler); 