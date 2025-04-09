import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/router';
import GenerationsGallery from '@/components/gallery/GenerationsGallery';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GalleryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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
        setUserId(user.id);
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

  // Handle regeneration from gallery
  const handleRegenerateFromPrompt = (prompt: string, imageUrl: string, generationId: string) => {
    // Navigate to generate page with the selected data
    router.push({
      pathname: '/dashboard/generate',
      query: {
        regenerate: 'true',
        prompt,
        imageUrl,
        generationId
      }
    });
  };

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
        <title>My Gallery - Instagen</title>
        <meta name="description" content="View your generated AI images with Instagen" />
      </Head>
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Gallery</h1>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Generated Images</CardTitle>
              <CardDescription>
                Browse your previously generated images. Select any image to use it as a base for new generations or to create variants.
              </CardDescription>
            </CardHeader>
          </Card>
          
          {userId && (
            <GenerationsGallery
              userId={userId}
              onSelectForRegeneration={handleRegenerateFromPrompt}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
} 