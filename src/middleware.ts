import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Skip middleware for next.js specific requests to avoid hydration errors
    if (request.nextUrl.pathname.includes('/_next/') || 
        request.nextUrl.pathname.includes('/api/') ||
        request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      return NextResponse.next()
    }

    // Create a Supabase client configured to use cookies
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })
    
    // Refresh session if expired - required for Server Components
    const { data: { session } } = await supabase.auth.getSession()

    // URLs that require authentication
    const authRequired = request.nextUrl.pathname.startsWith('/dashboard')
    
    // URLs for authentication pages
    const authUrls = ['/auth/login', '/auth/register']
    const isAuthUrl = authUrls.some(url => request.nextUrl.pathname === url)

    // If accessing protected route without auth
    if (authRequired && !session) {
      // Only handle actual page requests, not data requests
      if (!request.nextUrl.pathname.includes('/_next/data/')) {
        // Create the URL to redirect to
        const redirectUrl = new URL('/auth/login', request.url)
        
        // Only add redirectedFrom for non-API and non-NextJS requests
        if (!request.nextUrl.pathname.startsWith('/api/')) {
          redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
        }
        
        return NextResponse.redirect(redirectUrl)
      }
    }

    // If accessing auth pages with valid session
    if (isAuthUrl && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  // Match all routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
} 