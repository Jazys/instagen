import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Static paths that should skip auth middleware
const PUBLIC_PATHS = [
  '/_next/',
  '/api/',  // Make sure all API routes are public
  '/api/stripe/create-checkout-session',  // Specifically exclude this API endpoint
  '/api/stripe/',  // Exclude all Stripe API endpoints
  '/favicon.ico',
  '/static/',
  '/images/',
  '/',  // Add the home page to public paths
]

// Extensions that should skip auth middleware
const PUBLIC_EXTENSIONS = [
  '.ico', '.png', '.jpg', '.jpeg', '.svg', '.css', '.js', '.json', '.txt', '.woff', '.woff2'
]

// Paths that require authentication
const PROTECTED_PATHS = ['/dashboard']

// Auth-related paths
const AUTH_PATHS = ['/auth/login', '/auth/register']

/**
 * Checks if a path should skip middleware processing
 */
function shouldSkipMiddleware(path: string, url: string): boolean {
  // Skip API routes 
  if (path.startsWith('/api/')) return true;
  
  // Skip Next.js data requests
  if (url.includes('/_next/data/') || url.includes('.json')) return true;
  
  // Check if it matches any public path
  const isPublicPath = PUBLIC_PATHS.some(prefix => path.startsWith(prefix));
  
  // Check if it has a public file extension
  const hasPublicExt = PUBLIC_EXTENSIONS.some(ext => path.endsWith(ext));
  
  return isPublicPath || hasPublicExt;
}

/**
 * Check if we're in a redirect loop
 */
function isRedirectLoop(request: NextRequest): boolean {
  const redirectCount = Number(request.headers.get('x-redirect-count') || '0');
  return redirectCount >= 2;
}

/**
 * Create a redirect response with proper headers to track redirects
 */
function createRedirectResponse(url: URL, request: NextRequest): NextResponse {
  const redirectCount = Number(request.headers.get('x-redirect-count') || '0');
  const response = NextResponse.redirect(url);
  response.headers.set('x-redirect-count', String(redirectCount + 1));
  return response;
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    
    // Skip middleware for paths that don't need auth checks
    if (shouldSkipMiddleware(pathname, request.url)) {
      return NextResponse.next();
    }

    // Create a response so we can set cookies later
    const res = NextResponse.next();
    
    // Create a Supabase client
    const supabase = createMiddlewareClient({ req: request, res });
    
    // Refresh session if available
    const { data: { session } } = await supabase.auth.getSession();
    
    // Determine the type of path being accessed
    const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
    const isAuthPath = AUTH_PATHS.includes(pathname);
    
    // Break redirect loops if detected
    if (isRedirectLoop(request)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Handle redirects based on auth state and path type
    if (isProtectedPath && !session) {
      // Redirect unauthenticated users to login
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return createRedirectResponse(redirectUrl, request);
    }

    if (isAuthPath && session) {
      // Redirect authenticated users to dashboard
      return createRedirectResponse(new URL('/dashboard', request.url), request);
    }

    // Allow the request to proceed normally
    return res;
  } catch (error) {
    // Continue the request even if there's an error in the middleware
    return NextResponse.next();
  }
}

export const config = {
  // Explicitly exclude API routes and static assets from middleware processing
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
    '/'
  ],
} 