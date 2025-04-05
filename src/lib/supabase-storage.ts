import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_BUCKET = 'generated-images';

/**
 * Uploads a base64 data URI to Supabase Storage
 * @param dataUri - base64 data URI of the image
 * @param userId - User ID to create folder structure
 * @returns URL of the uploaded image
 */
export async function uploadImageFromDataUri(
  dataUri: string,
  userId: string
): Promise<string> {
  try {
    // Extract base64 content and determine file extension
    const regex = /^data:image\/(\w+);base64,(.+)$/;
    const matches = dataUri.match(regex);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URI format');
    }
    
    const fileExtension = matches[1];
    const base64Content = matches[2];
    
    // Convert base64 to binary
    const binaryData = Buffer.from(base64Content, 'base64');
    
    // Generate a unique filename with user folder
    const filename = `${userId}/${uuidv4()}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, binaryData, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImageFromDataUri:', error);
    throw error;
  }
}

/**
 * Inserts a generation record into the database
 * @param userId - User ID
 * @param enhancedPrompt - The prompt used for generation
 * @param imageUrl - URL of the stored image
 * @param enhancedPromptExternal - Optional customization prompt
 * @returns The created generation record
 */
export async function saveGeneration(
  userId: string,
  enhancedPrompt: string,
  imageUrl: string,
  enhancedPromptExternal?: string
) {
  const { data, error } = await supabase
    .from('generations')
    .insert({
      user_id: userId,
      enhanced_prompt: enhancedPrompt,
      enhanced_prompt_external: enhancedPromptExternal || null,
      image_url: imageUrl,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving generation to database:', error);
    throw error;
  }
  
  return data;
}

/**
 * Fetches all generations for a user
 * @param userId - User ID
 * @returns Array of generation records
 */
export async function fetchUserGenerations(userId: string) {
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user generations:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Updates the external prompt for an existing generation
 * @param generationId - Generation ID to update
 * @param enhancedPromptExternal - New customization prompt
 * @returns The updated generation record
 */
export async function updateGenerationPrompt(
  generationId: string,
  enhancedPromptExternal: string
) {
  const { data, error } = await supabase
    .from('generations')
    .update({ enhanced_prompt_external: enhancedPromptExternal })
    .eq('id', generationId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating generation:', error);
    throw error;
  }
  
  return data;
} 