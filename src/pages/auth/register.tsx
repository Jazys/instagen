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
import { STORAGE_KEY, getSession, BASE_URL } from "@/lib/auth"
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

  // Function to safely show toast with fallback
  const showToast = (title: string, description: string, variant: "destructive" | "default" = "destructive") => {
    
    // Try direct DOM approach first for guaranteed visibility
    const toastDiv = document.createElement('div');
    toastDiv.style.position = 'fixed';
    toastDiv.style.bottom = '20px';
    toastDiv.style.right = '20px';
    toastDiv.style.backgroundColor = variant === 'destructive' ? '#f87171' : '#60a5fa';
    toastDiv.style.color = 'white';
    toastDiv.style.padding = '1rem';
    toastDiv.style.borderRadius = '0.5rem';
    toastDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    toastDiv.style.zIndex = '9999';
    toastDiv.style.maxWidth = '350px';
    toastDiv.style.overflow = 'hidden';
    
    const titleEl = document.createElement('div');
    titleEl.style.fontWeight = 'bold';
    titleEl.textContent = title;
    
    const descEl = document.createElement('div');
    descEl.textContent = description;
    
    toastDiv.appendChild(titleEl);
    toastDiv.appendChild(descEl);
    document.body.appendChild(toastDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toastDiv)) {
        document.body.removeChild(toastDiv);
      }
    }, 5000);
    
    // Also try the regular toast
    try {
      toast({
        title,
        description,
        variant,
      });
    } catch (e) {
      console.error("Toast hook failed:", e);
      // DOM fallback already handled above
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession()
        if (session) {
          window.location.replace(`${BASE_URL}/dashboard`)
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
      showToast("Error", "Passwords do not match");
      return
    }

    try {
      setLoading(true)
      
      // Validate email format before proceeding
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        showToast("Error", "Please enter a valid email address");
        setLoading(false)
        return
      }

      // Validate username (no special characters except underscore, 3-20 chars)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
      if (!usernameRegex.test(formData.username)) {
        showToast("Username Error", "Username must be 3-20 characters and contain only letters, numbers, and underscores");
        setLoading(false)
        return
      }

      // NEW: Check if username already exists before attempting signup
      try {
        console.log("Checking if username is available...");
        const { data: existingProfile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', formData.username)
          .maybeSingle();
          
        if (existingProfile) {
          showToast("Username Already Taken", "This username is already in use. Please choose a different one.");
          setLoading(false);
          return;
        }
        
        if (error && error.code !== 'PGRST116') { // Code for no rows returned
          console.warn("Error checking username availability:", error);
          // Continue anyway - better to try registration than block unnecessarily
        }
      } catch (usernameCheckError) {
        console.error("Error checking username:", usernameCheckError);
        // Continue with registration attempt
      }
      
      // Implement retry logic for signup
      let authData = null;
      let authError = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          // Sign up the user with a retry mechanism
          const result = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.fullName,
                username: formData.username,
              },
              emailRedirectTo: `${BASE_URL}/dashboard`,
            }
          });
          
          authData = result.data;
          authError = result.error;
          
          if (!authError) {
            break; // Success, exit retry loop
          }
          
          // If error is not related to server issues, don't retry
          if (authError.status !== 500 && authError.status !== 503 && !authError.message.includes('network')) {
            break;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        } catch (e) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (authError) {
        throw authError;
      }

      // Update how we handle user creation and profile setup
      if (authData?.user) {
        // Store the registered email for the confirmation dialog
        setRegisteredEmail(formData.email);
        
        // Give the database trigger time to complete (longer wait to ensure trigger completes)
        console.log("User created, waiting for database trigger to complete...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Get the session to confirm we're logged in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          // Continue - we'll try to recover
        }

        // First check if the trigger has already created the profile and quota
        let triggerWorked = false;
        try {
          const [profileResult, quotaResult] = await Promise.all([
            supabase.from('profiles').select('id').eq('id', authData.user.id).single(),
            supabase.from('user_quotas').select('user_id').eq('user_id', authData.user.id).single()
          ]);
          
          if (!profileResult.error && profileResult.data && !quotaResult.error && quotaResult.data) {
            console.log("Database trigger successfully created profile and quota");
            triggerWorked = true;
          } else {
            console.log("Database trigger didn't complete successfully:", {
              profileError: profileResult.error,
              quotaError: quotaResult.error
            });
          }
        } catch (checkError) {
          console.error("Error checking if trigger worked:", checkError);
        }
        
        // Only use fallbacks if the trigger didn't work
        if (!triggerWorked) {
          console.log("Using fallback methods to create profile and quota...");
          
          // Try the server API first for better security
          let apiWorked = false;
          try {
            const profileResponse = await fetch(`${BASE_URL}/api/user/setup-profile`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: formData.email,
                username: formData.username,
                fullName: formData.fullName,
                userId: authData.user.id
              }),
              credentials: 'include'
            });
            
            if (profileResponse.ok) {
              console.log("Profile and quota created via API");
              apiWorked = true;
            } else {
              console.warn("Profile setup via API failed:", await profileResponse.text());
            }
          } catch (apiError) {
            console.error("Profile API error:", apiError);
          }
          
          // Final fallback: direct DB access as last resort
          if (!apiWorked && session) {
            try {
              console.log("Attempting direct database fallback...");
              
              // Try to create profile
              await supabase
                .from('profiles')
                .upsert({
                  id: session.user.id,
                  email: formData.email,
                  username: formData.username,
                  full_name: formData.fullName,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
              
              // Try to create quota
              await supabase
                .from('user_quotas')
                .upsert({
                  user_id: session.user.id,
                  credits_remaining: 100,
                  next_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  last_reset_date: new Date().toISOString(),
                }, { onConflict: 'user_id' });
                
              console.log("Direct database fallback completed");
            } catch (directDbError) {
              console.error("Direct profile setup error:", directDbError);
              // We've tried everything, continue anyway
            }
          }
        }
        
        // Handle session and redirection regardless of how profile was created
        if (session) {
          // Store session in localStorage for consistency
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
          
          showToast("Success", "Registration successful! Redirecting to dashboard...", "default");
          
          // Show email confirmation dialog
          setShowEmailConfirmation(true);
          
          // Wait a moment for session to be fully established
          setTimeout(() => {
            window.location.replace(`${BASE_URL}/dashboard`);
          }, 3000);
        } else {
          showToast("Success", "Registration successful! Please check your email to confirm your account.", "default");
          // Show the email confirmation dialog
          setShowEmailConfirmation(true);
        }
      } else {
        showToast("Notice", "Registration initiated. Please check your email to confirm your account.", "default");
        // Show the email confirmation dialog
        setShowEmailConfirmation(true);
      }
    } catch (error) {
      console.error("Registration failed:", error);
      let errorMessage = "Failed to register";
      
      if (error instanceof Error) {
        // Custom error message handling based on error type
        if (error.message.includes("User already registered")) {
          errorMessage = "This email is already registered. Please log in instead.";
        } else if (error.message.includes("rate limit")) {
          errorMessage = "Too many attempts. Please try again later.";
        } else if (error.message.includes("password")) {
          errorMessage = "Password is too weak. Use at least 8 characters with a mix of letters, numbers and symbols.";
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast("Error", errorMessage);
    } finally {
      setLoading(false);
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