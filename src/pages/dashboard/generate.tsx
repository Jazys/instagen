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
import ImageCustomizer from '@/components/customization/ImageCustomizer';
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
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [shouldRegenerateVariant, setShouldRegenerateVariant] = useState(false);
  
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

  // Handle regeneration parameters from the gallery page
  useEffect(() => {
    if (router.query.regenerate === 'true' && 
        router.query.prompt && 
        router.query.imageUrl && 
        router.query.generationId) {
      try {
        // Set data from query parameters - make sure to properly decode all URL parameters
        const promptText = decodeURIComponent(router.query.prompt as string);
        const basePromptText = router.query.basePrompt ? decodeURIComponent(router.query.basePrompt as string) : '';
        const imageUrl = decodeURIComponent(router.query.imageUrl as string);
        const generationId = router.query.generationId as string;
        
        // Check if this is a variant (from enhanced_prompt_external) or base model (from enhanced_prompt)
        const isVariant = router.query.isVariant === 'true';
        
        // Check if we should regenerate or just load the image
        // This allows us to differentiate between "Load" vs "Gen new Photo"
        const shouldRegenerate = router.query.action === 'regenerate';
        
        console.log("=== Regeneration Parameters ===");
        console.log("- prompt (decoded):", promptText);
        console.log("- isVariant:", isVariant);
        console.log("- basePrompt (decoded):", basePromptText);
        console.log("- generationId:", generationId);
        console.log("- action:", router.query.action || "view"); // Default action is just viewing
        console.log("==============================");
        
        if (isVariant) {
          // For variants, the promptText is enhanced_prompt_external
          console.log("Loading variant with customization prompt:", promptText);
          setGeneratedPrompt(promptText); // Display the customization in the UI
          
          // We need the original model prompt too
          setGeneratedPromptForAModel(basePromptText || promptText);
          
          // Only set the regeneration flag if we're specifically asked to regenerate
          // This way "Load" just displays the variant, while "Gen new Photo" regenerates
          if (shouldRegenerate) {
            console.log("Setting regeneration flag - will create a new variant");
            setShouldRegenerateVariant(true);
          } else {
            console.log("Just loading the variant for viewing - no regeneration needed");
          }
        } else {
          // For base models, promptText is enhanced_prompt
          console.log("Loading base model with prompt:", promptText);
          setGeneratedPrompt(promptText);
          setGeneratedPromptForAModel(promptText);
        }
        
        setCurrentImage(imageUrl);
        setCurrentGenerationId(generationId);
        
        toast({
          title: "Image Loaded",
          description: isVariant ? "Variant loaded from gallery." : "Model loaded from gallery.",
          variant: "default",
        });
      } catch (error) {
        console.error('Error processing regeneration parameters:', error);
        toast({
          title: "Error",
          description: "Failed to process image parameters properly. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [router.query, toast]);

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
        title: "Success",
        description: "Your influencer has been created successfully!",
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
          title: "Error",
          description: error instanceof Error ? error.message : "An error occurred while generating the image",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // Handle customization complete - wrap with useCallback for stability
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
          // Use the original enhanced prompt to maintain the model-variant relationship
          enhancedPrompt: generatedPromptForAModel, // This is the ORIGINAL model prompt
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
      
      // IMPORTANT: Don't update generatedPromptForAModel here - it should stay as the original prompt
      // Only update the display prompt with the customization
      setGeneratedPrompt(data.enhancedPromptExternal);
      
      // Save both values in case we need to create another variant
      console.log("Preserving original prompt:", data.enhancedPrompt);
      console.log("Using customization prompt for display:", data.enhancedPromptExternal);
      
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

  // New effect to auto-generate when a variant is loaded 
  // Now placed AFTER handleCustomizationComplete is defined
  useEffect(() => {
    // Only proceed if we have all necessary data and should regenerate
    if (shouldRegenerateVariant && 
        generatedPrompt && 
        generatedPromptForAModel && 
        userId && 
        !generating) {
      
      console.log("=== Auto-generating new image ===");
      console.log("- Customization prompt (decoded):", generatedPrompt);
      console.log("- Original model prompt (decoded):", generatedPromptForAModel);
      console.log("================================");
      
      // Reset the flag to prevent repeated generation
      setShouldRegenerateVariant(false);
      
      // Prepare the customization options based on the prompt
      // This is a simple extraction, can be refined based on your prompt structure
      let background = "urban";
      let clothingColor = "blue";
      let action = "standing";
      
      // Extract background if present in the prompt
      if (generatedPrompt.includes("in a")) {
        const backgroundMatch = generatedPrompt.match(/in a ([a-z\s]+) setting/i);
        if (backgroundMatch && backgroundMatch[1]) {
          background = backgroundMatch[1].trim();
        }
      }
      
      // Extract clothing color if present
      if (generatedPrompt.includes("wearing")) {
        const clothingMatch = generatedPrompt.match(/wearing ([a-z\s]+) clothes/i);
        if (clothingMatch && clothingMatch[1]) {
          clothingColor = clothingMatch[1].trim();
        }
      }
      
      // Extract action/pose if present
      const poses = ['standing', 'sitting', 'walking', 'running', 'posing', 'jumping'];
      for (const pose of poses) {
        if (generatedPrompt.toLowerCase().includes(pose)) {
          action = pose;
          break;
        }
      }
      
      // Start the customization with extracted options
      // We need to pass a descriptive customization prompt (not the same as the generated prompt)
      // and ensure we're using the original model prompt
      setCustomizing(false); // Ensure customizing UI is not showing
      setGenerating(true);   // Set generating state to show loading
      
      // Log what we're sending to the API
      console.log("=== Sending to API ===");
      console.log("- Original model prompt used as enhancedPrompt:", generatedPromptForAModel);
      console.log("- Background:", background);
      console.log("- Clothing:", clothingColor);  
      console.log("- Action:", action);
      console.log("======================");
      
      // Call the API directly instead of using handleCustomizationComplete
      const fetchCustomization = async () => {
        try {
          const freshSession = await getSession();

          // Ensure the data we're sending to the API is clean and correctly formatted
          const apiBody = {
            // IMPORTANT: Use the original model prompt to maintain relationship
            enhancedPrompt: generatedPromptForAModel,
            background: background as BackgroundOption,
            clothingColor: clothingColor as ClothingColorOption,
            action: action as ActionOption
          };
          
          console.log("API request body:", JSON.stringify(apiBody, null, 2));

          // Call our customize API endpoint
          const response = await fetch('/api/customize-influ', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${freshSession?.access_token}`,
            },
            body: JSON.stringify(apiBody),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to customize image');
          }

          const data = await response.json();
          
          // Update the image with the result
          setCurrentImage(data.imageUrl);
          
          // CRITICAL: Keep the original model prompt for model relationship
          console.log("=== API Response ===");
          console.log("- Preserving original prompt:", data.enhancedPrompt);
          console.log("- Setting display prompt to:", data.enhancedPromptExternal);
          console.log("====================");
          
          // IMPORTANT: Don't update generatedPromptForAModel - it stays the original prompt
          // Update the display prompt with the customization
          setGeneratedPrompt(data.enhancedPromptExternal);
          
          toast({
            title: "New Variant Created",
            description: "Your customized influencer image has been generated!",
            variant: "default",
          });
        } catch (error) {
          console.error('Error in auto-generating customized image:', error);
          toast({
            title: "Generation Error",
            description: error instanceof Error ? error.message : "An error occurred while generating the customized image",
            variant: "destructive",
          });
        } finally {
          setGenerating(false);
        }
      };
      
      // Execute the customization
      fetchCustomization();
    }
  }, [shouldRegenerateVariant, generatedPrompt, generatedPromptForAModel, userId, generating, toast]);
  
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
          // IMPORTANT: Always use the original model prompt (generatedPromptForAModel)
          // for the enhanced_prompt field to maintain model-variant relationships
          enhancedPrompt: generatedPromptForAModel,
          // If this is a customized variant, also pass the customization text
          enhancedPromptExternal: generatedPrompt !== generatedPromptForAModel ? generatedPrompt : undefined
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
            <h1 className="text-3xl font-bold">Generate an influencer</h1>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Credit Usage</CardTitle>
              <CardDescription>
                Each image generation costs 20 credits, and customization costs 20 credits. Make sure you have enough credits before generating.
              </CardDescription>
            </CardHeader>
          </Card>
          
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
                      <Label>Sex</Label>
                      <RadioGroup
                        defaultValue={personCharacteristics.gender}
                        onValueChange={(value) => handleCharacteristicChange('gender', value)}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label htmlFor="male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label htmlFor="female">Female</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Body Type */}
                    <div className="space-y-2">
                      <Label htmlFor="bodyType">Body type</Label>
                      <Select
                        defaultValue={personCharacteristics.bodyType}
                        onValueChange={(value) => handleCharacteristicChange('bodyType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez le type de corps" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skinny">Slim</SelectItem>
                          <SelectItem value="fit">Fit</SelectItem>
                          <SelectItem value="athletic">Athletic</SelectItem>
                          <SelectItem value="curvy">Curvy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Chest Size */}
                    <div className="space-y-2">
                      <Label htmlFor="chestSize">Chest Size</Label>
                      <Select
                        defaultValue={personCharacteristics.chestSize}
                        onValueChange={(value) => handleCharacteristicChange('chestSize', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une taille" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="very-large">Very large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Butt Size */}
                    <div className="space-y-2">
                      <Label htmlFor="buttSize">Butt Size</Label>
                      <Select
                        defaultValue={personCharacteristics.buttSize}
                        onValueChange={(value) => handleCharacteristicChange('buttSize', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une taille" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="very-large">Very large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Skin Tone */}
                    <div className="space-y-2">
                      <Label>Skin color</Label>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span>Light</span>
                          <span>Tanned</span>
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
                      <Label htmlFor="eyeColor">Eyes Color</Label>
                      <Select
                        defaultValue={personCharacteristics.eyeColor}
                        onValueChange={(value) => handleCharacteristicChange('eyeColor', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une couleur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brown">Brown</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="hazel">Hazel</SelectItem>
                          <SelectItem value="amber">Amber</SelectItem>
                          <SelectItem value="gray">Gray</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hair Color */}
                    <div className="space-y-2">
                      <Label htmlFor="hairColor">Hair Color</Label>
                      <Select
                        defaultValue={personCharacteristics.hairColor}
                        onValueChange={(value) => handleCharacteristicChange('hairColor', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une couleur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brown">Brown</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="hazel">Hazel</SelectItem>
                          <SelectItem value="amber">Amber</SelectItem>
                          <SelectItem value="gray">Gray</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hair Style */}
                    <div className="space-y-2">
                      <Label htmlFor="hairStyle">Hair Style</Label>
                      <Select
                        defaultValue={personCharacteristics.hairStyle}
                        onValueChange={(value) => handleCharacteristicChange('hairStyle', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medium">Medium-length</SelectItem>
                          <SelectItem value="long">Long</SelectItem>
                          <SelectItem value="curly">Curly</SelectItem>
                          <SelectItem value="wavy">Wavy</SelectItem>
                          <SelectItem value="straight">Straight</SelectItem>
                          <SelectItem value="bald">Bald</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
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
                        <Label htmlFor="lastName">Last Name</Label>
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
                      <Label htmlFor="nationality">Nationality</Label>
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
                      <Label htmlFor="additionalPrompt">Additional Details</Label>
                      <textarea 
                        className="w-full min-h-[100px] p-3 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Add specific details about the desired image here... (e.g., 'a smiling person with blue eyes, standing on a beach at sunset, wearing casual clothes')"
                       value={additionalPrompt}
                        onChange={(e) => setAdditionalPrompt(e.target.value)}
                      ></textarea>
                      <p className="text-xs text-muted-foreground">
                      The more details you provide, the better your results will be. Include clothing, background, pose, expressions, etc.</p>
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
                            In progress...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate My Influencer
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
                          
                          {router.query.regenerate === 'true' && (
                            <Button 
                              variant="outline"
                              onClick={() => router.push('/dashboard/gallery')}
                              className="flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5"></path>
                                <path d="M12 19l-7-7 7-7"></path>
                              </svg>
                              Back to Gallery
                            </Button>
                          )}

                          {!customizing && currentGenerationId && (
                            <Button 
                              onClick={() => setCustomizing(true)}
                              variant="outline"
                              className="flex items-center gap-2"
                              style={{ display: router.query.isVariant === 'true' ? 'none' : 'flex' }}
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
                        <h3 className="font-medium mb-2">
                          {router.query.isVariant === 'true' ? 'Customization Prompt:' : 'Generated Prompt:'}
                        </h3>
                        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md overflow-auto max-h-[200px]">
                          {generatedPrompt}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 