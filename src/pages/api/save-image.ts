import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { uploadImageFromDataUri, saveGeneration } from '@/lib/supabase-storage';

/**
 * API route to save an image to Supabase storage and database
 * 
 * Request body:
 * - imageDataUri: The data URI of the image to save
 * - enhancedPrompt: The prompt used for generation
 * 
 * Response:
 * - success: boolean
 * - generationId: string - ID of the saved generation record
 * - storedImageUrl: string - URL of the stored image
 * - message?: string - Success/error message
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Save image API called");
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let token: string  = "";

  try {
    // Check for token in the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization header missing or invalid' 
      });
    }
    
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log("Found token in Authorization header");
    
    // Validate the token using Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      console.error("Token validation error:", error);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication token' 
      });
    }
    
    const userId = data.user.id;
    console.log("Using user ID from token:", userId);

    // Extract image data and prompt from request
    const { imageDataUri, enhancedPrompt } = req.body;

    if (!imageDataUri || !enhancedPrompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required image data or prompt'
      });
    }

    // No credits required for save operation as it's just storage
    console.log("Starting upload to Supabase Storage");
    
    // Upload image to Supabase Storage
    const storedImageUrl = await uploadImageFromDataUri(imageDataUri, userId, token);
    console.log("Image stored at:", storedImageUrl);
    
    // Save generation record to database
    const generationRecord = await saveGeneration(
      userId,
      enhancedPrompt,
      storedImageUrl
    );
    const generationId = generationRecord.id;
    console.log("Generation saved with ID:", generationId);
    
    // Return successful response
    return res.status(200).json({
      success: true,
      generationId,
      storedImageUrl,
      message: 'Image saved successfully',
    });

  } catch (error) {
    console.error('Error saving image:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
} 