import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { getUser, signOut, getSession } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import Head from 'next/head'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import useCredits from '@/hooks/useCredits'
import Link from 'next/link'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { creditsRemaining, formattedNextReset, isLoading: creditsLoading } = useCredits()

  useEffect(() => {
    const loadUserAndProfile = async () => {
      try {
        setLoading(true)
        // Check if we have a valid session using the new helper function
        const session = await getSession()
        
        if (!session) {
          throw new Error("No active session")
        }
        
        // Get the authenticated user
        const user = await getUser()
        if (!user) {
          throw new Error("User data not available")
        }
        
        setUser(user)
        
        // Fetch the user's profile from the profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        if (data) {
          setProfile(data)
        }
      } catch (error) {
        console.error("Dashboard data loading error:", error)
        
        // Redirect to login if there's an authentication issue
        toast({
          title: "Authentication Error",
          description: "Please sign in to access the dashboard",
          variant: "destructive",
        })
        
        // Clear any potentially corrupted session data
        await supabase.auth.signOut()
        
        // Use window.location.replace for a full redirect
        window.location.replace('/auth/login')
      } finally {
        setLoading(false)
      }
    }
    
    loadUserAndProfile()
  }, [router, toast])

  const handleSignOut = async () => {
    try {
      setLoading(true)
      
      toast({
        title: "Signing out...",
        description: "Please wait while we sign you out",
      })
      
      await signOut()
      
      toast({
        title: "Success",
        description: "Signed out successfully",
      })
      
      // The signOut function already handles the redirect
    } catch (error) {
      console.error("Sign out error:", error)
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign out",
        variant: "destructive",
      })
      
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... - Instagen</title>
        </Head>
        <Navbar />
        <main className="pt-24 min-h-screen">
          <div className="container flex items-center justify-center">
            <p>Loading your dashboard...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Dashboard - Instagen</title>
        <meta name="description" content="Your Instagen Dashboard" />
      </Head>

      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">
              Welcome, {profile?.username || user?.email?.split('@')[0] || 'User'}
            </h1>
            <div className="flex space-x-3">
              <Link href="/dashboard/generate">
                <Button variant="outline" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Generate
                </Button>
              </Link>
              <Link href="/dashboard/profile">
                <Button variant="outline">
                  Profile
                </Button>
              </Link>
              
                        
              <Button 
                variant="outline"
                onClick={handleSignOut}
                disabled={loading}
              >
                Sign Out
              </Button>
            </div>
          </div>
          
          <div className="grid gap-6">

            {/* Getting Started Card */}
            <div className="p-6 bg-card rounded-lg border">
              <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
              <p className="text-muted-foreground">
                Welcome to your Instagen dashboard! This is where you'll manage your AI influencer content and settings.
              </p>
            </div>

            {/* User Profile Card */}
            <div className="p-6 bg-card rounded-lg border">
              <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
              <div className="space-y-2">
                <p><strong>Full Name:</strong> {profile?.full_name || 'Not provided'}</p>
                <p><strong>Username:</strong> {profile?.username || 'Not set'}</p>
                <p><strong>Email:</strong> {profile?.email || user?.email || 'Not available'}</p>
                <p><strong>Account Created:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </div>
            
            {/* Credits Card */}
            <div className="p-6 bg-card rounded-lg border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Credits</h2>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold">{creditsLoading ? '...' : creditsRemaining}</p>
                  <p className="text-sm text-muted-foreground">credits remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Next Reset</p>
                  <p className="text-sm text-muted-foreground">{creditsLoading ? '...' : formattedNextReset}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Need more credits?</p>
                  <div className="flex space-x-2 mt-2">
                    {/* Custom Quick Test Button */}
                    <Button 
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Show a processing toast
                          toast({
                            title: "Processing...",
                            description: "Testing credit usage"
                          });
                          
                          // Get a fresh session
                          const freshSession = await getSession();
                          
                          if (!freshSession) {
                            toast({
                              title: "Authentication Error",
                              description: "Your session has expired. Please log in again.",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Make the API call with the fresh token
                          const response = await fetch('/api/credits/use-credit', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${freshSession.access_token}`,
                            },
                            body: JSON.stringify({
                              actionType: 'test_quick',
                            }),
                          });
                          
                          const data = await response.json();
                          
                          if (!response.ok) {
                            // Handle 402 Payment Required
                            if (response.status === 402) {
                              toast({
                                title: "Insufficient Credits",
                                description: "You don't have enough credits for this action. Please purchase more.",
                                variant: "destructive",
                                action: (
                                  <Button 
                                    variant="outline" 
                                    className="bg-green-600 hover:bg-green-700 text-white border-0"
                                    onClick={() => router.push('/dashboard/credits')}
                                  >
                                    Buy Credits
                                  </Button>
                                ),
                              });
                            } else {
                              toast({
                                title: "Error",
                                description: data.error || "An error occurred",
                                variant: "destructive"
                              });
                            }
                          } else {
                            // Success
                            toast({
                              title: "Success",
                              description: `Credit used! You have ${data.credits_remaining} credits remaining.`
                            });
                            // Refresh the page after a delay
                            setTimeout(() => window.location.reload(), 1500);
                          }
                        } catch (error) {
                          console.error("Error:", error);
                          toast({
                            title: "Connection Error",
                            description: "Failed to connect to the server. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Use 1 test credit
                    </Button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Link href="/dashboard/profile">
                    <Button variant="outline" size="sm">
                      Profile
                    </Button>
                  </Link>
                  <Link href="/dashboard/credits">
                    <Button className="bg-green-600 hover:bg-green-700" size="sm">
                      Buy Credits
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
} 