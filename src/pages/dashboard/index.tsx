import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { getUser, signOut } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import Head from 'next/head'
import { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser()
      setUser(user)
    }
    loadUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Success",
        description: "Signed out successfully",
      })
      router.push('/')
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign out",
        variant: "destructive",
      })
    }
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
            <h1 className="text-3xl font-bold">Welcome, {user?.email}</h1>
            <Button 
              variant="outline"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
          
          <div className="grid gap-6">
            {/* Add your dashboard content here */}
            <div className="p-6 bg-card rounded-lg border">
              <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
              <p className="text-muted-foreground">
                Welcome to your Instagen dashboard! This is where you'll manage your AI influencer content and settings.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
} 