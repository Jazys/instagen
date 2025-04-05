import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js'

const STORAGE_BUCKET = 'generated-images';

/**
 * Uploads a base64 data URI to Supabase Storage
 * @param dataUri - base64 data URI of the image
 * @param userId - User ID to create folder structure
 * @returns URL of the uploaded image
 */
export async function uploadImageFromDataUri(
  dataUri: string,
  userId: string,
  token: string
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

    console.log("Token:", token);

    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    {
    const { data, error } = await supabaseWithToken.rpc('get_auth_uid');
    if (error) {
      console.error('Erreur lors de l\'appel de get_auth_uid:', error);
    } else {
      console.log('auth.uid() retourne:', data);
    }}

    console.log('Uploading image to Supabase:', userId, fileExtension);
    
    // More explicit handling of the user ID format
    const userIdStr = userId.toString();
    console.log("Using user ID for storage path:", userIdStr);
    
    // Generate a unique filename with user folder
    const filename = `${userIdStr}/${uuidv4()}.${fileExtension}`;
    console.log("Generated filename for upload:", filename);
    
  
    
    // Upload to Supabase Storage with explicit logging
    console.log("Starting upload to bucket:", STORAGE_BUCKET);
    const { data, error } = await supabaseWithToken.storage
      .from(STORAGE_BUCKET)
      .upload(filename, binaryData, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading to Supabase (detailed):', JSON.stringify(error));
      throw error;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabaseWithToken.storage
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
  const { data, error } = await supabase.rpc('save_generation', {
    p_user_id: userId,
    p_enhanced_prompt: enhancedPrompt,
    p_image_url: imageUrl,
    p_enhanced_prompt_external: enhancedPromptExternal,
  });

  if (error) {
    console.error('Error saving generation via RPC:', error);
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
  enhancedPromptExternal: string,
  token: string
) {

  console.log("Token:", token);

  const supabaseWithToken = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
  
  const { data, error } = await supabaseWithToken
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