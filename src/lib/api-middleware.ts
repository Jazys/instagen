import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { STORAGE_KEY } from './auth';

export type ApiHandler = (
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string
) => Promise<void>;

// Standard error responses
const errorResponses = {
  unauthorized: (res: NextApiResponse, message = 'You must be logged in to access this resource.') => {
    return res.status(401).json({
      error: 'Unauthorized',
      message
    });
  },
  
  serverError: (res: NextApiResponse, message = 'An unexpected error occurred.') => {
    return res.status(500).json({
      error: 'Internal server error',
      message
    });
  }
};

/**
 * Create a Supabase client with the token from cookies or auth header
 */
function createAuthClient(req: NextApiRequest) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
  
  // Try to get token from cookies first
  let accessToken = '';
  if (req.cookies[STORAGE_KEY]) {
    try {
      const tokenData = JSON.parse(req.cookies[STORAGE_KEY]);
      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
      }
    } catch {
      // Silent fail, will try Authorization header next
    }
  }
  
  // If no token in cookies, try Authorization header
  if (!accessToken && req.headers.authorization?.startsWith('Bearer ')) {
    accessToken = req.headers.authorization.substring(7);
  }
  
  // If we found a token, set it in the Supabase client
  if (accessToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });
  }
  
  return supabase;
}

/**
 * Middleware to protect API routes with Supabase authentication
 * @param handler - The API route handler function
 * @returns A new handler that checks authentication before proceeding
 */
export function withAuth(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Create a Supabase client with auth from request
      const supabase = createAuthClient(req);
      
      // Get the session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return errorResponses.unauthorized(res);
      }
      
      // Call the handler with the authenticated user's ID
      return await handler(req, res, session.user.id);
    } catch (error) {
      return errorResponses.serverError(res);
    }
  };
} 