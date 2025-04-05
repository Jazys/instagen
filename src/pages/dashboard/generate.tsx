import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getUser, getSession, STORAGE_KEY } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageCustomizer from '@/components/customization/ImageCustomizer';
import GenerationsGallery from '@/components/gallery/GenerationsGallery';
import { BackgroundOption, ClothingColorOption, ActionOption } from '@/components/customization/ImageCustomizer';

export default function GeneratePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [currentImage, setCurrentImage] = useState('/placeholder-image.png');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generatedPromptForAModel, setGeneratedPromptForAModel] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
  // New state for person characteristics
  const [personCharacteristics, setPersonCharacteristics] = useState({
    gender: 'female',
    bodyType: 'athletic',
    chestSize: 'medium', 
    buttSize: 'medium',
    skinTone: 50, // On a scale of 0-100, 0 being lightest
    eyeColor: 'brown',
    hairColor: 'brown',
    hairStyle: 'long',
    firstName: '',
    lastName: '',
    nationality: '',
    age: 25,
  });

  const handleCharacteristicChange = (name: string, value: string | number) => {
    setPersonCharacteristics(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
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

  // Handle the Influ generation with GPT-4o and Replicate
  const handleGenerateInflu = async () => {
    try {
      setGenerating(true);
      setCustomizing(false);
      
      // Collect all the characteristics and the prompt into one object
      const generationData = {
        personCharacteristics,
        additionalPrompt,
      };

      const freshSession = await getSession();
      
      // Call our API endpoint
      const response = await fetch('/api/generate-influ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession?.access_token}`,
        },
        body: JSON.stringify(generationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate image');
      }

      const data = await response.json();

      console.log("Generation response:", data);
      
      // Update the image with the result
      setCurrentImage(data.imageUrl);
      
      // Store the enhanced prompt for display
      setGeneratedPrompt(data.enhancedPrompt || data.prompt || '');
      setGeneratedPromptForAModel(data.enhancedPrompt || data.prompt || '');
      
      // Save the generation ID for customization
      if (data.generationId) {
        setCurrentGenerationId(data.generationId);
        // Don't automatically show customization options - let user see preview first
      }
      
      toast({
        title: "Génération réussie",
        description: "Votre influenceur personnalisé a été créé avec succès!",
        variant: "default",
      });
    } catch (error) {
      console.error('Error generating influ:', error);
      
      // Check if this is an authentication error
      if (error instanceof Error && error.message.includes('logged in')) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        toast({
          title: "Erreur de génération",
          description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la génération de l'image",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // Handle customization complete
  const handleCustomizationComplete = async (enhancedPromptExternal: string, options: {
    background: BackgroundOption;
    clothingColor: ClothingColorOption;
    action: ActionOption;
  }) => {
    try {
      setCustomizing(false);
      setGenerating(true);
      
      const freshSession = await getSession();

      // Call our customize API endpoint
      const response = await fetch('/api/customize-influ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession?.access_token}`,
        },
        body: JSON.stringify({
          // Use the enhanced prompt external if it exists (from previous customization)
          // otherwise use the original enhanced prompt
          enhancedPrompt: generatedPromptForAModel,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to customize image');
      }

      const data = await response.json();
      
      // Update the image with the result
      setCurrentImage(data.imageUrl);
      
      // Update the prompt
      setGeneratedPrompt(data.enhancedPromptExternal );
      
      toast({
        title: "Customization Successful",
        description: "Your customized influencer image has been created!",
        variant: "default",
      });
    } catch (error) {
      console.error('Error customizing image:', error);
      toast({
        title: "Customization Error",
        description: error instanceof Error ? error.message : "An error occurred while customizing the image",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle regeneration from gallery
  const handleRegenerateFromPrompt = (prompt: string, imageUrl: string, generationId: string) => {
    // Set the enhanced prompt for display and for next customization
    setGeneratedPrompt(prompt);
    setGeneratedPromptForAModel(prompt);
    
    // Set the current image from storage
    setCurrentImage(imageUrl);
    
    // Set the generation ID for customization
    setCurrentGenerationId(generationId);
    
    // Switch to generate tab
    setActiveTab('generate');
    
    // Show success toast
    toast({
      title: "Image Loaded",
      description: "Image and prompt loaded from gallery for regeneration or customization",
      variant: "default",
    });
  };

  // Handle saving image to Supabase
  const handleSaveImage = async () => {
    try {
      if (currentImage === '/placeholder-image.png' || !userId || !generatedPrompt) {
        toast({
          title: "Cannot Save",
          description: "Please generate an image first before saving",
          variant: "destructive",
        });
        return;
      }

      // Set loading state
      setGenerating(true);
      
      const freshSession = await getSession();
      
      // Call our API endpoint to save the image
      const response = await fetch('/api/save-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession?.access_token}`,
        },
        body: JSON.stringify({
          imageDataUri: currentImage,
          enhancedPrompt: generatedPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save image');
      }

      const data = await response.json();
      
      // Update the generation ID for customization
      if (data.generationId) {
        setCurrentGenerationId(data.generationId);
      }
      
      toast({
        title: "Image Saved",
        description: "Your image has been saved to your gallery",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : "An error occurred while saving the image",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
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
                Each image generation costs 1 credit, and customization costs 1 credits. Make sure you have enough credits before generating.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="gallery">Your Gallery</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate">
              <div className="grid grid-cols-5 gap-8">
                <div className="col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Person Characteristics</CardTitle>
                      <CardDescription>
                        Define the physical characteristics and demographic information for the person in your image
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Gender Selection */}
                        <div className="space-y-2">
                          <Label>Sexe</Label>
                          <RadioGroup
                            defaultValue={personCharacteristics.gender}
                            onValueChange={(value) => handleCharacteristicChange('gender', value)}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="male" id="male" />
                              <Label htmlFor="male">Homme</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="female" id="female" />
                              <Label htmlFor="female">Femme</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Body Type */}
                        <div className="space-y-2">
                          <Label htmlFor="bodyType">Forme du corps</Label>
                          <Select
                            defaultValue={personCharacteristics.bodyType}
                            onValueChange={(value) => handleCharacteristicChange('bodyType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez le type de corps" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skinny">Mince</SelectItem>
                              <SelectItem value="fit">Bien construit</SelectItem>
                              <SelectItem value="athletic">Athlétique</SelectItem>
                              <SelectItem value="curvy">Avec des courbes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Chest Size */}
                        <div className="space-y-2">
                          <Label htmlFor="chestSize">Taille de la poitrine</Label>
                          <Select
                            defaultValue={personCharacteristics.chestSize}
                            onValueChange={(value) => handleCharacteristicChange('chestSize', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez une taille" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Petite</SelectItem>
                              <SelectItem value="medium">Moyenne</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                              <SelectItem value="very-large">Très large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Butt Size */}
                        <div className="space-y-2">
                          <Label htmlFor="buttSize">Taille des fesses</Label>
                          <Select
                            defaultValue={personCharacteristics.buttSize}
                            onValueChange={(value) => handleCharacteristicChange('buttSize', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez une taille" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Petit</SelectItem>
                              <SelectItem value="medium">Moyen</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                              <SelectItem value="very-large">Très large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Skin Tone */}
                        <div className="space-y-2">
                          <Label>Couleur de peau</Label>
                          <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                              <span>Clair</span>
                              <span>Bronzé</span>
                            </div>
                            <Slider
                              defaultValue={[personCharacteristics.skinTone]}
                              max={100}
                              step={1}
                              onValueChange={(value) => handleCharacteristicChange('skinTone', value[0])}
                              className="w-full"
                            />
                          </div>
                        </div>

                        {/* Eye Color */}
                        <div className="space-y-2">
                          <Label htmlFor="eyeColor">Couleur des yeux</Label>
                          <Select
                            defaultValue={personCharacteristics.eyeColor}
                            onValueChange={(value) => handleCharacteristicChange('eyeColor', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez une couleur" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="brown">Marron</SelectItem>
                              <SelectItem value="blue">Bleu</SelectItem>
                              <SelectItem value="green">Vert</SelectItem>
                              <SelectItem value="hazel">Noisette</SelectItem>
                              <SelectItem value="amber">Ambre</SelectItem>
                              <SelectItem value="gray">Gris</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Hair Color */}
                        <div className="space-y-2">
                          <Label htmlFor="hairColor">Couleur des cheveux</Label>
                          <Select
                            defaultValue={personCharacteristics.hairColor}
                            onValueChange={(value) => handleCharacteristicChange('hairColor', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez une couleur" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="black">Noir</SelectItem>
                              <SelectItem value="brown">Brun</SelectItem>
                              <SelectItem value="blonde">Blond</SelectItem>
                              <SelectItem value="red">Roux</SelectItem>
                              <SelectItem value="auburn">Auburn</SelectItem>
                              <SelectItem value="silver">Gris/Argent</SelectItem>
                              <SelectItem value="white">Blanc</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Hair Style */}
                        <div className="space-y-2">
                          <Label htmlFor="hairStyle">Style des cheveux</Label>
                          <Select
                            defaultValue={personCharacteristics.hairStyle}
                            onValueChange={(value) => handleCharacteristicChange('hairStyle', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short">Court</SelectItem>
                              <SelectItem value="medium">Mi-long</SelectItem>
                              <SelectItem value="long">Long</SelectItem>
                              <SelectItem value="curly">Bouclé</SelectItem>
                              <SelectItem value="wavy">Ondulé</SelectItem>
                              <SelectItem value="straight">Lisse</SelectItem>
                              <SelectItem value="bald">Chauve</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">Prénom</Label>
                            <input 
                              type="text"
                              id="firstName"
                              className="w-full p-2 rounded-md border border-input bg-transparent text-sm"
                              placeholder="Prénom"
                              value={personCharacteristics.firstName}
                              onChange={(e) => handleCharacteristicChange('firstName', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Nom</Label>
                            <input 
                              type="text"
                              id="lastName"
                              className="w-full p-2 rounded-md border border-input bg-transparent text-sm"
                              placeholder="Nom"
                              value={personCharacteristics.lastName}
                              onChange={(e) => handleCharacteristicChange('lastName', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Nationality */}
                        <div className="space-y-2">
                          <Label htmlFor="nationality">Nationalité</Label>
                          <input 
                            type="text"
                            id="nationality"
                            className="w-full p-2 rounded-md border border-input bg-transparent text-sm"
                            placeholder="Nationalité"
                            value={personCharacteristics.nationality}
                            onChange={(e) => handleCharacteristicChange('nationality', e.target.value)}
                          />
                        </div>

                        {/* Age */}
                        <div className="space-y-2">
                          <Label>Age (18-100)</Label>
                          <div className="flex items-center space-x-4">
                            <Slider
                              defaultValue={[personCharacteristics.age]}
                              min={18}
                              max={100}
                              step={1}
                              onValueChange={(value) => handleCharacteristicChange('age', value[0])}
                              className="w-full"
                            />
                            <span className="min-w-[3rem] text-center font-medium">
                              {personCharacteristics.age}
                            </span>
                          </div>
                        </div>
                        
                        {/* Additional Prompt */}
                        <div className="space-y-2">
                          <Label htmlFor="additionalPrompt">Détails supplémentaires</Label>
                          <textarea 
                            className="w-full min-h-[100px] p-3 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Ajoutez des détails spécifiques sur l'image désirée ici... (ex: 'personne souriante avec les yeux bleus, debout sur une plage au coucher du soleil, portant une tenue décontractée')"
                            value={additionalPrompt}
                            onChange={(e) => setAdditionalPrompt(e.target.value)}
                          ></textarea>
                          <p className="text-xs text-muted-foreground">
                            Plus vous fournissez de détails, meilleurs seront vos résultats. Incluez des vêtements, l'arrière-plan, la pose, les expressions, etc.
                          </p>
                        </div>
                        
                        {/* Generate Influ Button */}
                        <div className="pt-4">
                          <Button 
                            onClick={handleGenerateInflu}
                            className="w-full py-6 text-white font-semibold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
                            disabled={generating}
                          >
                            {generating ? (
                              <span className="flex items-center gap-2">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Génération en cours...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Générer mon Influ
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="col-span-3">
                  {customizing && currentGenerationId && !generating ? (
                    <ImageCustomizer
                      imageUrl={currentImage}
                      generationId={currentGenerationId}
                      enhancedPrompt={generatedPrompt}
                      onCustomizationComplete={handleCustomizationComplete}
                    />
                  ) : (
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle>Preview</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 flex flex-col items-center justify-center">
                        {currentImage === '/placeholder-image.png' ? (
                          <div className="w-full aspect-square bg-muted flex items-center justify-center rounded-md">
                            <p className="text-muted-foreground text-center p-8">
                              Your generated image will appear here
                            </p>
                          </div>
                        ) : (
                          <>
                            <img 
                              src={currentImage} 
                              alt="Generated image" 
                              className="rounded-md shadow-lg max-h-[500px] object-contain" 
                            />
                            
                            <div className="flex mt-4 gap-3 w-full">
                              <Button 
                                onClick={handleSaveImage} 
                                disabled={generating}
                                className="flex items-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save">
                                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                  <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                Save to Gallery
                              </Button>
                              
                              {!customizing && currentGenerationId && (
                                <Button 
                                  onClick={() => setCustomizing(true)}
                                  variant="outline"
                                  className="flex items-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-palette">
                                    <circle cx="13.5" cy="6.5" r=".5"></circle>
                                    <circle cx="17.5" cy="10.5" r=".5"></circle>
                                    <circle cx="8.5" cy="7.5" r=".5"></circle>
                                    <circle cx="6.5" cy="12.5" r=".5"></circle>
                                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
                                  </svg>
                                  Customize & Create Variant
                                </Button>
                              )}
                            </div>
                            
                            {generating && (
                              <div className="mt-4 py-3 px-4 bg-muted rounded-md flex items-center justify-center">
                                <div className="flex items-center space-x-2">
                                  <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Processing your request...</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {generatedPrompt && (
                          <div className="mt-4 w-full">
                            <h3 className="font-medium mb-2">Generated Prompt:</h3>
                            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                              {generatedPrompt}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="gallery">
              {userId && (
                <GenerationsGallery
                  userId={userId}
                  onSelectForRegeneration={handleRegenerateFromPrompt}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
} 