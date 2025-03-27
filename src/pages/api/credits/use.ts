import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/api-middleware';
import { CreditsService } from '@/lib/credits-service';

/**
 * API route to use credits for an action
 * 
 * Request body:
 * - actionType: string - Type of action being performed
 * - credits: number - Number of credits to use
 * 
 * Response:
 * - success: boolean - Whether the credits were successfully used
 * - creditsRemaining: number - Remaining credits after the action
 * - nextResetDate: string - Date when credits will next reset
 * - message?: string - Error message if applicable
 */
async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const { actionType, credits } = req.body;
    
    if (!actionType || typeof actionType !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'actionType is required and must be a string' 
      });
    }
    
    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'credits is required and must be a positive number' 
      });
    }
    
    // Attempt to use credits
    const result = await CreditsService.useCredits(userId, actionType, credits);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        creditsUsed: result.credits_used,
        creditsRemaining: result.credits_remaining,
        nextResetDate: result.next_reset_date
      });
    } else {
      return res.status(402).json({  // 402 Payment Required is appropriate for quota limits
        success: false,
        creditsRemaining: result.credits_remaining,
        creditsRequired: result.credits_required,
        nextResetDate: result.next_reset_date,
        message: result.message || 'Insufficient credits'
      });
    }
  } catch (error) {
    console.error('Error using credits:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}

export default withAuth(handler); 