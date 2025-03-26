import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Static paths that should skip auth middleware
const PUBLIC_PATHS = [
  '/_next/',
  '/api/',
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
 * Determines if a path should skip the middleware
 */
function isPublicPath(path: string): boolean {
  // Check if it's a public path
  if (PUBLIC_PATHS.some(prefix => path.startsWith(prefix))) {
    return true
  }

  // Check if it has a public file extension
  if (PUBLIC_EXTENSIONS.some(ext => path.endsWith(ext))) {
    return true
  }

  return false
}

/**
 * Check if a URL is a data request (used by Next.js)
 */
function isDataRequest(url: string): boolean {
  return url.includes('/_next/data/') || url.includes('.json');
}

/**
 * Format expiry date with time remaining
 */
function formatExpiryInfo(expiresAt?: number): string {
  if (!expiresAt) return 'No expiry set';
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiresAt - now;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  
  return `${new Date(expiresAt * 1000).toISOString()} (${minutes}m ${seconds}s remaining)`;
}

/**
 * Check if we're in a redirect loop
 */
function isRedirectLoop(request: NextRequest): boolean {
  const redirectCount = Number(request.headers.get('x-redirect-count') || '0');
  return redirectCount >= 2;
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    
    // Skip data requests to prevent redirection loops
    if (isDataRequest(request.url)) {
      return NextResponse.next()
    }

    // Skip middleware for static files and API routes
    if (isPublicPath(pathname)) {
      return NextResponse.next()
    }

    // Create a response now so we can set cookies later
    const res = NextResponse.next()
    
    // Create a Supabase client
    const supabase = createMiddlewareClient({ req: request, res })
    
    // Refresh session
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware session error:', error.message)
    }
    
    const session = data.session
    
    // Check for protected paths
    const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path))
    const isAuthPath = AUTH_PATHS.includes(pathname)
    const redirectLoopDetected = isRedirectLoop(request)

    // Debug info
    console.log('Middleware session check:', {
      path: pathname,
      isProtectedPath,
      isAuthPath,
      hasSession: !!session,
      userId: session?.user?.id?.slice(0, 6) || 'none',
      sessionExpiry: session?.expires_at ? formatExpiryInfo(session.expires_at) : 'no session',
      redirectCount: request.headers.get('x-redirect-count') || '0',
    })

    // If we detect a redirect loop, break it
    if (redirectLoopDetected) {
      console.log('Breaking redirect loop - too many redirects')
      return NextResponse.redirect(new URL('/', request.url))
    }

    // If user is accessing a protected path without a session
    if (isProtectedPath && !session) {
      const redirectCount = Number(request.headers.get('x-redirect-count') || '0')
      
      console.log('Redirecting unauthenticated user from protected path:', pathname)
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', pathname)
      
      // Set a header to track redirects
      const redirectResponse = NextResponse.redirect(redirectUrl)
      redirectResponse.headers.set('x-redirect-count', String(redirectCount + 1))
      return redirectResponse
    }

    // If user is on an auth page with a valid session
    if (isAuthPath && session) {
      const redirectCount = Number(request.headers.get('x-redirect-count') || '0')
      
      console.log('Redirecting authenticated user from auth page to dashboard')
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
      redirectResponse.headers.set('x-redirect-count', String(redirectCount + 1))
      return redirectResponse
    }

    // Allow the request to proceed normally
    return res
  } catch (error) {
    // Log error in production-friendly way
    console.error('Auth middleware error:', error instanceof Error ? error.message : 'Unknown error')
    
    // Always continue the request even if there's an error
    return NextResponse.next()
  }
}

export const config = {
  // Matcher for all routes except static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/'
  ],
} 