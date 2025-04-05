import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/api-middleware';
import { enhancePromptWithGPT } from '@/lib/prompt-service';

/**
 * API route to enhance a prompt using GPT-4o-mini
 * 
 * Request body:
 * - prompt: string - The base prompt to enhance
 * 
 * Response:
 * - success: boolean
 * - enhancedPrompt: string - The enhanced prompt
 * - message?: string - Success/error message
 */
async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract prompt from request
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid prompt'
      });
    }

    // Enhance the prompt using the service function
    const enhancedPrompt = await enhancePromptWithGPT(prompt);

    // Return successful response
    return res.status(200).json({
      success: true,
      enhancedPrompt,
      message: 'Prompt enhanced successfully',
    });

  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
}

export default withAuth(handler); 