import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getUser, getSession } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GeneratorForm } from '@/components/generator/GeneratorForm';
import { PreviewSection } from '@/components/generator/PreviewSection';

export default function GeneratePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState('/photo-8-m84j64ee.jpeg');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  
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
        <title>Generate Image - Instagen</title>
        <meta name="description" content="Generate AI images with Instagen" />
      </Head>
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">AI Image Generator</h1>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Credit Usage</CardTitle>
              <CardDescription>
                Each image generation costs 1 credit. Make sure you have enough credits before generating.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-5 gap-8">
            <div className="col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Image Characteristics</CardTitle>
                  <CardDescription>
                    Describe any additional details or specific characteristics you want in your generated image
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <textarea 
                      className="w-full min-h-[100px] p-3 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Add specific details about your desired image here... (e.g., 'smiling person with blue eyes, standing on a beach at sunset, wearing casual attire')"
                      value={additionalPrompt}
                      onChange={(e) => setAdditionalPrompt(e.target.value)}
                    ></textarea>
                    <p className="text-xs text-muted-foreground">
                      The more details you provide, the better your results will be. Include clothing, background, pose, expressions, etc.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <GeneratorForm 
                onGenerate={setCurrentImage} 
                additionalPrompt={additionalPrompt}
              />
            </div>
            
            <div className="col-span-3">
              <PreviewSection currentImage={currentImage} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 