import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import useCredits from "@/hooks/useCredits"

export const Navbar = () => {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const { creditsRemaining, isLoading: creditsLoading } = useCredits()
  
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
              <Link href="/dashboard/generate">
                Create Influencer
              </Link>
            </Button>
          )}

          {isClient && isLoggedIn && (
            <Button variant="ghost" asChild>
              <Link href="/dashboard/gallery">
                Manage influencers
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!isClient ? (
            // Static placeholder for SSR to prevent hydration errors
            <div className="w-[150px] h-9"></div>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-3">
              {/* Credits display */}
              {!creditsLoading && (
                <div className="flex items-center text-green-600 font-medium">
                  Credits:
                  {creditsRemaining}
                </div>
              )}
              
              {/* User dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <span>Account</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
             
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href="/dashboard">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Dashboard</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href="/discord" target="_blank">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 9.17a7.79 7.79 0 0 0-1.57-3.57 7.31 7.31 0 0 0-.8-.8 7.79 7.79 0 0 0-3.57-1.57c-.17-.02-.34-.03-.51-.03s-.34.01-.51.03c-1.37.15-2.65.74-3.57 1.57a7.31 7.31 0 0 0-.8.8 7.79 7.79 0 0 0-1.57 3.57c-.02.17-.03.34-.03.51s.01.34.03.51a7.79 7.79 0 0 0 1.57 3.57c.1.1.18.18.26.26 1.5 1.3 3.09 1.63 4.62 1.63s3.12-.33 4.62-1.63c.08-.08.16-.16.26-.26a7.79 7.79 0 0 0 1.57-3.57c.02-.17.03-.34.03-.51s-.01-.34-.03-.51z" />
                          <path d="m15.9 11-2.1-.08a.78.78 0 0 0-.65.31L12 12.85l-1.15-1.62a.78.78 0 0 0-.65-.31L8.1 11a.28.28 0 0 0-.15.52l1.5 1.37a.73.73 0 0 0 .96.03L12 11.5l1.58 1.43c.27.25.7.25.97-.03l1.5-1.37a.28.28 0 0 0-.15-.52z" />
                        </svg>
                        <span>Discord Community</span>
                        <span className="ml-1 text-xs rounded bg-emerald-500 text-white px-1">en</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href="/dashboard/credits">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z" />
                          <polyline points="8 10 12 14 16 10" />
                        </svg>
                        <span>Manage your subscription</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
        
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
                  >
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Sign Out</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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