import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/layout/Navbar"
import Head from "next/head"
import Link from "next/link"
import { Footer } from "@/components/layout/Footer"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/router"
import { useToast } from "@/components/ui/use-toast"
import { STORAGE_KEY, getSession } from "@/lib/auth"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    username: "",
  })

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking for existing session on register page...")
        const session = await getSession()
        
        if (session) {
          console.log("Existing session found, redirecting to dashboard")
          // Redirect to dashboard using window.location.replace for a complete refresh
          window.location.replace('/dashboard')
          return
        }
      } catch (error) {
        console.error("Session check failed:", error instanceof Error ? error.message : "Unknown error")
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("Attempting user registration")
      
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
          }
        }
      })

      if (authError) {
        console.error("Registration error:", authError.message)
        throw authError
      }

      if (authData.user) {
        console.log("User created successfully:", authData.user.id)
        
        // The profiles table should be automatically populated via the Supabase trigger function
        // But we can verify the session is working
        
        // Get the session to confirm we're logged in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("Session check error:", sessionError.message)
          throw sessionError
        }

        if (session) {
          console.log("Session established, session details:", {
            userId: session.user.id,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown',
          })
          
          // Manually create a profile in case the trigger didn't work
          try {
            console.log("Manually creating user profile just in case...")
            // Check if profile already exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (!existingProfile) {
              // Profile doesn't exist, create it
              const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: formData.email,
                  username: formData.username,
                  full_name: formData.fullName,
                  updated_at: new Date().toISOString()
                });
                
              if (profileError) {
                console.error("Error creating profile manually:", profileError.message);
                // We'll continue anyway since this is a fallback
              } else {
                console.log("Profile created manually successfully");
              }
            } else {
              console.log("Profile already exists, no need to create manually");
            }
            
            // Also check and create user quota if needed
            const { data: existingQuota } = await supabase
              .from('user_quotas')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
              
            if (!existingQuota) {
              console.log("Manually creating user quota...");
              const { error: quotaError } = await supabase
                .from('user_quotas')
                .insert({
                  user_id: session.user.id,
                  credits_remaining: 100, // Default starting credits
                  next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                  last_reset_date: new Date().toISOString(),
                });
                
              if (quotaError) {
                console.error("Error creating user quota manually:", quotaError.message);
                // Continue anyway as this is just a fallback
              } else {
                console.log("User quota created manually successfully");
              }
            } else {
              console.log("User quota already exists, no need to create manually");
            }
          } catch (profileError) {
            console.error("Error in manual profile creation:", profileError);
            // Continue anyway as this is just a fallback
          }
          
          toast({
            title: "Success",
            description: "Registration successful! Redirecting to dashboard...",
          })
          
          // Store session in localStorage for consistency
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
          console.log("Session saved to storage")
          
          // Wait a moment for session to be fully established
          setTimeout(() => {
            // Force a browser navigation to dashboard for a full page refresh
            console.log("Redirecting to dashboard")
            window.location.replace('/dashboard')
          }, 1000) // Use a longer timeout
        } else {
          console.log("No session after registration, redirecting to login")
          toast({
            title: "Success",
            description: "Registration successful! Please log in.",
          })
          router.push("/auth/login")
        }
      } else {
        console.warn("User object not returned from registration")
        toast({
          title: "Notice",
          description: "Registration initiated. Please check your email to confirm your account.",
        })
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("Registration failed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to register",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking for session
  if (checkingSession) {
    return (
      <>
        <Head>
          <title>Create Account - Instagen</title>
        </Head>
        <Navbar />
        <main className="pt-24 min-h-screen">
          <div className="container flex items-center justify-center">
            <p>Checking authentication status...</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Create Account - Instagen</title>
        <meta name="description" content="Create your Instagen account" />
      </Head>

      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
              <CardDescription>
                Enter your details to create your Instagen account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    name="email"
                    type="email" 
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username"
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                </Button>
                <div className="text-sm text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}