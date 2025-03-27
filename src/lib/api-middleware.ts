import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export type ApiHandler = (
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string
) => Promise<void>;

/**
 * Middleware to protect API routes with Supabase authentication
 * @param handler - The API route handler function
 * @returns A new handler that checks authentication before proceeding
 */
export function withAuth(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Create a Supabase client for the server using the direct approach
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
      {
        auth: {
          persistSession: false,
          // Extract cookies from the request headers to get the session
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
    
    // Add auth header from cookie if present
    const token = req.cookies['sb-auth-token'];
    if (token) {
      try {
        const tokenData = JSON.parse(token);
        const accessToken = tokenData?.access_token;
        if (accessToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: tokenData?.refresh_token || '',
          });
        }
      } catch (e) {
        console.error('Error parsing auth token:', e);
      }
    }
    
    try {
      // Get the session from the request
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Authentication error:', error.message);
        return res.status(401).json({
          error: 'Authentication error',
          message: 'There was a problem with authentication.',
        });
      }
      
      // If no session is found, the user is not authenticated
      if (!session) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource.',
        });
      }
      
      // Call the handler with the authenticated user's ID
      return await handler(req, res, session.user.id);
    } catch (error) {
      console.error('Error in auth middleware:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred.',
      });
    }
  };
} 