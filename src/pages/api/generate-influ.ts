import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/api-middleware';
import { CreditsService } from '@/lib/credits-service';
import Replicate from 'replicate';
import { supabase } from '@/lib/supabase';
import { enhancePromptWithGPT, enhancePromptMock } from '@/lib/prompt-service';
import { uploadImageFromDataUri, saveGeneration } from '@/lib/supabase-storage';
// import Replicate from 'replicate';

/**
 * API route to generate an image using GPT-4o and Replicate
 * 
 * Request body:
 * - personCharacteristics: object with all the person details
 * - additionalPrompt: string with additional details
 * 
 * Response:
 * - success: boolean
 * - imageUrl: string - URL of the generated image (as a data URI)
 * - message?: string - Success/error message
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse, userId: string) {
  console.log("API called with userId from middleware:", userId);
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for token in the Authorization header if userId is not provided by middleware
    if (!userId) {
      console.log("No userId from middleware, checking Authorization header");
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
    }

    // Extract generation parameters from request
    const { personCharacteristics, additionalPrompt } = req.body;

    if (!personCharacteristics) {
      return res.status(400).json({
        success: false,
        message: 'Missing required person characteristics'
      });
    }

    // Credits required for this operation
    const creditsRequired = 1; // Advanced generation costs more

    // Check and consume credits
    const creditResult = await CreditsService.useCredits(
      userId,
      'generate-influ',
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

    // Build a detailed prompt based on the person characteristics
    let basePrompt = 'Create a photorealistic image of an influencer, with following characteristics:';
    
    // Gender
    basePrompt += `${personCharacteristics.gender === 'male' ? 'Male' : 'Female'} person, `;
    
    // Body Type
    switch(personCharacteristics.bodyType) {
      case 'skinny': basePrompt += 'skinny body type, '; break;
      case 'fit': basePrompt += 'fit and well-built body, '; break;
      case 'athletic': basePrompt += 'athletic body type, '; break;
      case 'curvy': basePrompt += 'curvy body type, '; break;
    }
    
    // Chest Size (only if female)
    if (personCharacteristics.gender === 'female') {
      switch(personCharacteristics.chestSize) {
        case 'small': basePrompt += 'small chest, '; break;
        case 'medium': basePrompt += 'medium sized chest, '; break;
        case 'large': basePrompt += 'large chest, '; break;
        case 'very-large': basePrompt += 'very large chest, '; break;
      }
    }
    
    // Butt Size
    switch(personCharacteristics.buttSize) {
      case 'small': basePrompt += 'small butt, '; break;
      case 'medium': basePrompt += 'medium sized butt, '; break;
      case 'large': basePrompt += 'large butt, '; break;
      case 'very-large': basePrompt += 'very large butt, '; break;
    }
    
    // Skin Tone
    const skinToneDesc = personCharacteristics.skinTone < 25 ? 'very light' :
                       personCharacteristics.skinTone < 50 ? 'light' :
                       personCharacteristics.skinTone < 75 ? 'tan' : 'dark';
    basePrompt += `${skinToneDesc} skin tone, `;
    
    // Eye Color
    if (personCharacteristics.eyeColor) {
      basePrompt += `${personCharacteristics.eyeColor} eyes, `;
    }
    
    // Hair Color and Style
    if (personCharacteristics.hairColor && personCharacteristics.hairStyle) {
      basePrompt += `${personCharacteristics.hairStyle} ${personCharacteristics.hairColor} hair, `;
    }
    
    // Age
    basePrompt += `${personCharacteristics.age} years old, `;
    
    // Name and Nationality (if provided)
    if (personCharacteristics.firstName && personCharacteristics.lastName) {
      basePrompt += `named ${personCharacteristics.firstName} ${personCharacteristics.lastName}, `;
    }
    
    if (personCharacteristics.nationality) {
      basePrompt += `${personCharacteristics.nationality} nationality, `;
    }

    // Include any additional prompt details
    if (additionalPrompt) {
      basePrompt += additionalPrompt;
    }

    console.log("Initial prompt:", basePrompt);

    // Enhance the prompt using our prompt service
    let enhancedPrompt = basePrompt;
    
    try {
      // Direct function call instead of API call
      enhancedPrompt = await enhancePromptWithGPT(basePrompt);
      console.log("Enhanced prompt:", enhancedPrompt);
    } catch (enhanceError) {
      console.error("Error enhancing prompt:", enhanceError);
      // Fallback to mock enhancement if OpenAI API fails
      enhancedPrompt = enhancePromptMock(basePrompt);
      console.log("Using mock enhanced prompt:", enhancedPrompt);
    }
    
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
          prompt: enhancedPrompt // Use enhanced prompt instead of base prompt
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
        storedImageUrl
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
      imageUrl: dataUri, // Send data URI for immediate display
      storedImageUrl, // Also send the stored URL for reference
      generationId, // Send the generation ID for customization
      prompt: basePrompt,
      enhancedPrompt,
      message: 'Image generated successfully',
      creditsRemaining: creditResult.credits_remaining,
    });

  } catch (error) {
    console.error('Error generating influencer image:', error);
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

