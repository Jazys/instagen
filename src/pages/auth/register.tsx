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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
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
        const session = await getSession()
        if (session) {
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
        throw authError
      }

      // Store the registered email for the confirmation dialog
      setRegisteredEmail(formData.email)

      if (authData.user) {
        // Get the session to confirm we're logged in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError
        }

        if (session) {
          // Manually create a profile and quota as backup in case triggers didn't work
          try {
            // Check if profile already exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();
              
            if (!existingProfile) {
              // Profile doesn't exist, create it
              await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: formData.email,
                  username: formData.username,
                  full_name: formData.fullName,
                  updated_at: new Date().toISOString()
                });
            }
            
            // Check and create user quota if needed
            const { data: existingQuota } = await supabase
              .from('user_quotas')
              .select('user_id')
              .eq('user_id', session.user.id)
              .single();
              
            if (!existingQuota) {
              await supabase
                .from('user_quotas')
                .insert({
                  user_id: session.user.id,
                  credits_remaining: 100, // Default starting credits
                  next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                  last_reset_date: new Date().toISOString(),
                });
            }
          } catch (profileError) {
            // Continue anyway as this is just a fallback
          }
          
          toast({
            title: "Success",
            description: "Registration successful! Redirecting to dashboard...",
          })
          
          // Store session in localStorage for consistency
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
          
          // Show email confirmation dialog
          setShowEmailConfirmation(true)
          
          // Wait a moment for session to be fully established
          setTimeout(() => {
            window.location.replace('/dashboard')
          }, 3000) // Use a longer timeout to give users time to read the confirmation
        } else {
          toast({
            title: "Success",
            description: "Registration successful! Please check your email to confirm your account.",
          })
          // Show the email confirmation dialog
          setShowEmailConfirmation(true)
        }
      } else {
        toast({
          title: "Notice",
          description: "Registration initiated. Please check your email to confirm your account.",
        })
        // Show the email confirmation dialog
        setShowEmailConfirmation(true)
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
      
      {/* Email Confirmation Dialog */}
      <Dialog open={showEmailConfirmation} onOpenChange={setShowEmailConfirmation}>
        <DialogContent className="max-w-md sm:max-w-lg bg-white border-0 shadow-lg">
          <DialogHeader className="space-y-3">
            <div className="mx-auto bg-purple-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-purple-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800">Check Your Inbox</DialogTitle>
          </DialogHeader>
          
          <div className="my-6 text-center space-y-4">
            <p className="text-gray-600">
              We've sent a verification link to:
            </p>
            <p className="font-medium text-lg break-all bg-gray-50 py-2 px-3 rounded-md border border-gray-100">
              {registeredEmail}
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-left text-blue-700">
              <p>Please verify your email address to activate your account. The email may take a few minutes to arrive and could be in your spam folder.</p>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col gap-3 mt-2">
            <Button 
              onClick={() => {
                setShowEmailConfirmation(false);
                router.push('/auth/login');
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-6 text-base shadow-md hover:shadow-lg transition-all"
            >
              Go to Login Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}