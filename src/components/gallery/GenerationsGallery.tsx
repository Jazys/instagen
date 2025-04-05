import { useState, useEffect } from 'react';
import { fetchUserGenerations } from '@/lib/supabase-storage';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import ImageCustomizer from '@/components/customization/ImageCustomizer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Generation type matching our database table
interface Generation {
  id: string;
  user_id: string;
  enhanced_prompt: string;
  enhanced_prompt_external: string | null;
  image_url: string;
  created_at: string;
}

// Model for grouping generations
interface ModelWithVariants {
  model: Generation;
  variants: Generation[];
}

interface GenerationsGalleryProps {
  userId: string;
  onSelectForRegeneration?: (prompt: string, imageUrl: string, generationId: string) => void;
}

export default function GenerationsGallery({ userId, onSelectForRegeneration }: GenerationsGalleryProps) {
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [groupedGenerations, setGroupedGenerations] = useState<ModelWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [customizingId, setCustomizingId] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

  // Helper function to extract customization details between start and end markers
  const extractCustomization = (prompt: string, startMarker: string, endMarker: string): string => {
    try {
      const startIndex = prompt.indexOf(startMarker);
      if (startIndex === -1) return "N/A";
      
      const valueStartIndex = startIndex + startMarker.length;
      const endIndex = prompt.indexOf(endMarker, valueStartIndex);
      
      if (endIndex === -1) {
        // If end marker not found, extract until comma or end of string
        const commaIndex = prompt.indexOf(',', valueStartIndex);
        return commaIndex === -1 
          ? prompt.substring(valueStartIndex).trim() 
          : prompt.substring(valueStartIndex, commaIndex).trim();
      }
      
      return prompt.substring(valueStartIndex, endIndex).trim();
    } catch (error) {
      return "N/A";
    }
  };
  
  // Helper function to extract pose
  const extractPose = (prompt: string): string => {
    const poses = ['standing', 'sitting', 'walking', 'running', 'posing', 'jumping'];
    for (const pose of poses) {
      if (prompt.includes(pose)) {
        return pose;
      }
    }
    return "N/A";
  };

  // Fetch user generations on component mount
  useEffect(() => {
    if (userId) {
      loadGenerations();
    }
  }, [userId]);

  // Effect to organize generations into models and variants when generations state changes
  useEffect(() => {
    organizeGenerations();
  }, [generations]);

  // Group generations into models and variants
  const organizeGenerations = () => {
    console.log("Running organizeGenerations with:", generations);
    
    if (generations.length === 0) return;
    
    // Get all unique enhanced_prompt values
    const uniquePrompts = Array.from(new Set(generations.map(gen => gen.enhanced_prompt)));
    console.log("Unique prompts:", uniquePrompts);
    
    // Handle case where ALL generations have enhanced_prompt_external (no natural base models)
    let baseModels = generations.filter(gen => !gen.enhanced_prompt_external);
    console.log("Natural base models:", baseModels);
    
    // If no natural base models, create synthetic ones by taking the oldest generation for each prompt
    if (baseModels.length === 0) {
      console.log("No natural base models found, creating synthetic ones");
      
      // Group by enhanced_prompt
      const promptGroups: Record<string, Generation[]> = {};
      
      // Group generations by their enhanced_prompt
      generations.forEach(gen => {
        if (!promptGroups[gen.enhanced_prompt]) {
          promptGroups[gen.enhanced_prompt] = [];
        }
        promptGroups[gen.enhanced_prompt].push(gen);
      });
      
      // For each unique prompt, take the oldest generation as a "base model"
      baseModels = Object.values(promptGroups).map(group => {
        // Sort by creation date (oldest first)
        group.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        // Return the oldest generation for this prompt
        return group[0];
      });
      
      console.log("Synthetic base models:", baseModels);
    }
    
    // All other generations are potential variants
    // We need to filter out the base models from potential variants
    const baseModelIds = baseModels.map(model => model.id);
    const potentialVariants = generations.filter(gen => 
      !baseModelIds.includes(gen.id)
    );
    
    console.log("Potential variants:", potentialVariants);
    
    // Organize into model and variants
    const grouped: ModelWithVariants[] = [];
    
    // Process each base model
    baseModels.forEach(model => {
      // Find all variants that match this base model's prompt
      const variants = potentialVariants.filter(variant => 
        variant.enhanced_prompt === model.enhanced_prompt
      );
      
      console.log(`Model ${model.id} has ${variants.length} variants:`, variants);
      
      grouped.push({
        model,
        variants
      });
    });
    
    // Sort by creation date (newest first)
    grouped.sort((a, b) => 
      new Date(b.model.created_at).getTime() - new Date(a.model.created_at).getTime()
    );
    
    console.log("Final grouped generations:", grouped);
    
    setGroupedGenerations(grouped);
    
    // Initialize expanded state for new models
    const newExpandedState = { ...expandedModels };
    grouped.forEach(group => {
      if (newExpandedState[group.model.id] === undefined) {
        newExpandedState[group.model.id] = true; // Default to expanded
      }
    });
    setExpandedModels(newExpandedState);
  };

  // Load generations from Supabase
  const loadGenerations = async () => {
    try {
      setLoading(true);
      const data = await fetchUserGenerations(userId);
      console.log("Loaded generations from Supabase:", data);
      setGenerations(data);
    } catch (error) {
      console.error('Error fetching generations:', error);
      toast({
        title: "Error",
        description: "Failed to load your generated images.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle expanded state for a model
  const toggleModelExpanded = (modelId: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  // Handle downloading an image to local disk
  const handleDownloadImage = async (imageUrl: string, fileName: string) => {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      // Convert to blob
      const imageBlob = await response.blob();
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(imageBlob);
      downloadLink.download = `${fileName}.jpg`;
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: "Download Started",
        description: "Your image is being downloaded",
        variant: "default",
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle customization complete
  const handleCustomizationComplete = (generationId: string, enhancedPromptExternal: string) => {
    // Find the generation
    const generation = generations.find(gen => gen.id === generationId);
    
    // Update the local state
    setGenerations(prev => prev.map(gen => 
      gen.id === generationId 
        ? { ...gen, enhanced_prompt_external: enhancedPromptExternal } 
        : gen
    ));
    
    // Close the customizer
    setCustomizingId(null);

    // If a regeneration handler is provided, call it with the new prompt, image URL, and generationId
    if (onSelectForRegeneration && generation) {
      onSelectForRegeneration(
        enhancedPromptExternal,
        generation.image_url,
        generationId
      );
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading your generations...</div>;
  }

  if (generations.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-2">No Images Yet</h3>
        <p className="text-muted-foreground">Generate your first AI influencer to see it here!</p>
      </div>
    );
  }

  if (customizingId) {
    const customizingGeneration = generations.find(gen => gen.id === customizingId);
    if (!customizingGeneration) return null;
    
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold">Your Generated Images</h2>
        <div className="mb-6">
          <ImageCustomizer
            key={customizingGeneration.id}
            imageUrl={customizingGeneration.image_url}
            generationId={customizingGeneration.id}
            enhancedPrompt={customizingGeneration.enhanced_prompt}
            onCustomizationComplete={(enhancedPromptExternal) => 
              handleCustomizationComplete(customizingGeneration.id, enhancedPromptExternal)
            }
          />
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => setCustomizingId(null)}
          >
            Back to Gallery
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Generated Images</h2>
      
      <div className="space-y-4">
        {groupedGenerations.map((group) => (
          <Card key={group.model.id} className="overflow-hidden">
            <CardHeader className="p-2 pb-1">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <CardTitle className="text-base">
                  Model {new Date(group.model.created_at).toLocaleDateString()}
                </CardTitle>
              </div>
            </CardHeader>
            
            <div className="px-2 py-1">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Model - shown with prominence */}
                <div className="w-full sm:w-[180px]">
                  <Card className="overflow-hidden border-2 border-primary">
                    <div className="overflow-hidden h-[180px] relative group">
                      <img 
                        src={group.model.image_url} 
                        alt={`Base model ${group.model.id}`}
                        className="w-full h-full object-cover" 
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadImage(group.model.image_url, `influ-model-${group.model.id}`)}
                        className="absolute top-1 right-1 bg-black/30 hover:bg-black/50 rounded-full p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Download image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </Button>
                    </div>
                    <CardContent className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {group.model.enhanced_prompt_external ? 'First Image' : 'Model'}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between p-2 pt-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCustomizingId(group.model.id)}
                      >
                        Edit
                      </Button>
                      {onSelectForRegeneration && (
                        <Button 
                          size="sm"
                          onClick={() => onSelectForRegeneration(
                            group.model.enhanced_prompt,
                            group.model.image_url,
                            group.model.id
                          )}
                        >
                          Load
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </div>
                
                {/* Variants Section */}
                <div className="flex-1">
                  {group.variants.length > 0 ? (
                    <div className="border-l-2 border-muted pl-3 ml-1 h-full relative">
                      {/* Visual connector from model to variants */}
                      <div className="absolute -top-0 -left-2 h-4 w-4 border-l-2 border-t-2 border-muted hidden sm:block"></div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Variants ({group.variants.length})
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleModelExpanded(group.model.id)}
                          className="p-0 h-6 w-6"
                        >
                          {expandedModels[group.model.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </Button>
                      </div>
                      
                      {expandedModels[group.model.id] && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {group.variants.map((variant) => (
                            <Card key={variant.id} className="overflow-hidden border border-muted">
                              <div className="overflow-hidden h-[120px] relative group">
                                <img 
                                  src={variant.image_url} 
                                  alt={`Variant ${variant.id}`}
                                  className="w-full h-full object-cover" 
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDownloadImage(variant.image_url, `influ-variant-${variant.id}`)}
                                  className="absolute top-1 right-1 bg-black/30 hover:bg-black/50 rounded-full p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Download image"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                </Button>
                              </div>
                              <CardContent className="p-1">
                                <div className="flex items-center gap-1">
                                  <div className="bg-secondary text-secondary-foreground text-xs px-1 py-0.5 rounded-full text-[10px]">Variant</div>
                                </div>
                                
                                {/* Extract customization details if available */}
                                {variant.enhanced_prompt_external && (
                                  <div className="space-y-0 text-[10px]">
                                    {variant.enhanced_prompt_external.includes('wearing') && (
                                      <p className="flex items-center gap-1 truncate">
                                        <span className="font-medium">👕</span>
                                        <span>{extractCustomization(variant.enhanced_prompt_external, 'wearing', 'clothes')}</span>
                                      </p>
                                    )}
                                    
                                    {variant.enhanced_prompt_external.includes('in a') && (
                                      <p className="flex items-center gap-1 truncate">
                                        <span className="font-medium">🏞️</span>
                                        <span>{extractCustomization(variant.enhanced_prompt_external, 'in a', 'setting')}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                              <CardFooter className="flex justify-between p-1 gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-[10px] h-6 px-1"
                                  onClick={() => setCustomizingId(variant.id)}
                                >
                                  Edit
                                </Button>
                                {onSelectForRegeneration && (
                                  <Button 
                                    size="sm"
                                    className="text-[10px] h-6 px-1"
                                    onClick={() => onSelectForRegeneration(
                                      variant.enhanced_prompt_external || variant.enhanced_prompt,
                                      variant.image_url,
                                      variant.id
                                    )}
                                  >
                                    Load
                                  </Button>
                                )}
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center border border-dashed border-muted rounded-md p-4">
                      <p className="text-sm text-muted-foreground">No variants yet. Try customizing this model to create variants.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 