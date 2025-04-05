import { NextApiRequest, NextApiResponse } from 'next';
// Import withAuth for reference but don't use it
// import { withAuth } from '@/lib/api-middleware';
import { CreditsService } from '@/lib/credits-service';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';
import { enhancePromptWithGPT, enhancePromptMock } from '@/lib/prompt-service';
import { uploadImageFromDataUri, saveGeneration } from '@/lib/supabase-storage';

/**
 * API route to customize a previously generated image
 * 
 * Request body:
 * - enhancedPrompt: The base prompt from previous generation
 * - background: Background setting
 * - clothingColor: Clothing color
 * - action: Action/pose
 * 
 * Response:
 * - success: boolean
 * - imageUrl: string - URL of the generated image (as a data URI)
 * - message?: string - Success/error message
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Customize API called");
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for token in the Authorization header to get userId
    let userId: string | undefined = undefined;
    
    console.log("Checking Authorization header");
    const authHeader = req.headers.authorization;
    console.log("Authorization header:", authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization header missing or invalid' 
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log("Found token in Authorization header");
    
    try {
      // Validate the token using Supabase
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        console.error("Token validation error:", error);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid authentication token' 
        });
      }
      
      userId = data.user.id;
      console.log("Using user ID from token:", userId);
    } catch (tokenError) {
      console.error("Token validation error:", tokenError);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication token' 
      });
    }

    if (!userId) {
      console.error("Failed to get user ID");
      return res.status(401).json({
        success: false,
        message: 'Could not authenticate user'
      });
    }

    // Extract parameters from request
    const { 
      enhancedPrompt, 
      background, 
      clothingColor, 
      action 
    } = req.body;

    if (!enhancedPrompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required enhanced prompt'
      });
    }

    // Credits required for this operation (less than initial generation)
    const creditsRequired = 1;
    console.log(`Attempting to use ${creditsRequired} credits for user ${userId}`);

    // Check and consume credits
    const creditResult = await CreditsService.useCredits(
      userId,
      'customize-influ',
      creditsRequired
    );

    console.log("Credit result:", creditResult);

    if (!creditResult.success) {
      return res.status(402).json({
        success: false,
        creditsRemaining: creditResult.credits_remaining,
        creditsRequired,
        message: `Insufficient credits. You have ${creditResult.credits_remaining} credits, but this action requires ${creditsRequired} credits.`
      });
    }

    // Create the external prompt by extending the base prompt with customization options
    const enhancedPromptExternal = `${enhancedPrompt}, wearing ${clothingColor} clothes, ${action} in a ${background} setting`;
    console.log("External prompt:", enhancedPromptExternal);

    // Initialize Replicate with API token
    const replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Call Replicate to generate the image
    const output = await replicateClient.run(
      "black-forest-labs/flux-pro",
      {
        input: {
          width: 1024,
          height: 1024,
          prompt: enhancedPromptExternal
        }
      }
    );

    console.log("Replicate output:", output);

    // Get the image URL from Replicate
    const imageUrl = Array.isArray(output) ? output[0] : output;
    console.log("Image URL from Replicate:", imageUrl);
    
    // Convert the remote image to a base64 data URI
    const response = await fetch(imageUrl);
    const contentType = getContentType(response);
    console.log("Detected content type:", contentType);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("Image size (bytes):", buffer.length);
    
    // Convert to base64 and create data URI
    const base64Image = buffer.toString('base64');
    const dataUri = `data:${contentType};base64,${base64Image}`;
    console.log("Data URI created (first 50 chars):", dataUri.substring(0, 50) + "...");
    
    // Upload the image to Supabase Storage and get the public URL
    let storedImageUrl;
    let generationId;
    try {
      // Upload image to Supabase Storage
      storedImageUrl = await uploadImageFromDataUri(dataUri, userId);
      console.log("Image stored at:", storedImageUrl);
      
      // Save generation record to database
      const generationRecord = await saveGeneration(
        userId,
        enhancedPrompt,
        storedImageUrl,
        enhancedPromptExternal
      );
      generationId = generationRecord.id;
      console.log("Generation saved with ID:", generationId);
    } catch (storageError) {
      console.error("Failed to save to Supabase:", storageError);
      // Continue with the response even if storage fails
    }
    
    // Return successful response with data URI instead of URL
    return res.status(200).json({
      success: true,
      imageUrl: dataUri,
      storedImageUrl,
      generationId,
      enhancedPrompt: enhancedPrompt,
      enhancedPromptExternal: enhancedPromptExternal,
      message: 'Image customized successfully',
      creditsRemaining: creditResult.credits_remaining,
    });

  } catch (error) {
    console.error('Error customizing influencer image:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
}

// Helper function to determine content type from response
function getContentType(response: Response): string {
  const contentType = response.headers.get('content-type');
  return contentType || 'image/png'; // Default to PNG if not specified
} 