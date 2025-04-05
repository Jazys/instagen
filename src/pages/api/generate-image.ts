import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/api-middleware';
import { CreditsService } from '@/lib/credits-service';

/**
 * API route to generate an image (with credit consumption)
 * 
 * Request body:
 * - prompt: string - Description of the image to generate
 * - size: string - Size of the image ('small', 'medium', 'large')
 * 
 * Response:
 * - success: boolean - Whether the image was successfully generated
 * - imageUrl?: string - URL of the generated image
 * - creditsUsed: number - Number of credits used
 * - creditsRemaining: number - Remaining credits after the action
 * - message?: string - Error message if applicable
 */
async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const { prompt, size = 'medium' } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'prompt is required and must be a string' 
      });
    }
    
    // Determine credit cost based on image size
    let creditsRequired = 1; // Default for small size
    
    if (size === 'medium') {
      creditsRequired = 2;
    } else if (size === 'large') {
      creditsRequired = 4;
    }
    
    // Check and consume credits
    const creditResult = await CreditsService.useCredits(
      userId, 
      'generate-image', 
      creditsRequired
    );
    
    if (!creditResult.success) {
      return res.status(402).json({
        success: false,
        creditsRemaining: creditResult.credits_remaining,
        creditsRequired,
        message: `Insufficient credits. You have ${creditResult.credits_remaining} credits, but this action requires ${creditsRequired} credits.`
      });
    }
    
    // At this point, credits have been successfully consumed
    // Here you would implement the actual image generation logic
    // This is a placeholder for demonstration purposes
    
    // Simulate image generation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Example image URL (in a real implementation, this would be the URL of the generated image)
    const imageUrl = `https://example.com/generated-images/${Date.now()}-${size}.jpg`;
    
    // Return successful response
    return res.status(200).json({
      success: true,
      imageUrl,
      creditsUsed: creditsRequired,
      creditsRemaining: creditResult.credits_remaining,
      message: 'Image generated successfully',
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false,
    });
  }
}

export default withAuth(handler); 