import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getUser, getSession } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getUser();
        if (!user) {
          toast({
            title: "Authentication Error",
            description: "Please sign in to access this page",
            variant: "destructive",
          });
          router.push('/auth/login');
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth error:', error);
        toast({
          title: "Error",
          description: "An error occurred while checking authentication",
          variant: "destructive",
        });
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router, toast]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... - Instagen</title>
        </Head>
        <Navbar />
        <main className="pt-24 min-h-screen">
          <div className="container flex items-center justify-center">
            <p>Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Profile - Instagen</title>
      </Head>
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container">
          <h1 className="text-3xl font-bold mb-6">test</h1>
        </div>
      </main>
      <Footer />
    </>
  );
} 