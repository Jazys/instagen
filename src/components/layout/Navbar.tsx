import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export const Navbar = () => {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Check auth status - memoized for performance
  const checkAuth = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      setIsLoggedIn(!!data.session)
    } catch (error) {
      // Fail silently in production, user will appear logged out
      setIsLoggedIn(false)
    }
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    // Mark that we're on client-side to avoid hydration issues
    setIsClient(true)
    
    // Initial auth check
    checkAuth()
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session)
      }
    )
    
    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [checkAuth])

  const scrollToFeatures = () => {
    const featuresSection = document.querySelector("#features")
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" })
    } else if (router.pathname !== "/") {
      router.push("/#features")
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      // Silently fail and redirect anyway
      router.push('/')
    }
  }

  return (
    <header className="fixed top-0 w-full border-b bg-white z-50">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Instagen
          </span>
        </Link>

        <div className="hidden md:flex gap-6">
          <Button variant="ghost" asChild>
            <Link href="/">
              Home
            </Link>
          </Button>
          <Button variant="ghost" onClick={scrollToFeatures}>
            Features
          </Button>
          <Button variant="ghost" asChild>
            <Link 
              href="/pricing"
              className={router.pathname === "/pricing" ? "text-primary" : ""}
            >
              Pricing
            </Link>
          </Button>
          {isClient && isLoggedIn && (
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                Dashboard
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!isClient ? (
            // Static placeholder for SSR to prevent hydration errors
            <div className="w-[150px] h-9"></div>
          ) : isLoggedIn ? (
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">
                  Sign In
                </Link>
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity" asChild>
                <Link href="/auth/register">
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}