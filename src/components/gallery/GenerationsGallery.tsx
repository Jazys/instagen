import { useState, useEffect } from 'react';
import { fetchUserGenerations } from '@/lib/supabase-storage';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import ImageCustomizer from '@/components/customization/ImageCustomizer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Generation type matching our database table
interface Generation {
  id: string;
  user_id: string;
  enhanced_prompt: string;
  enhanced_prompt_external: string | null;
  image_url: string;
  created_at: string;
}

interface GenerationsGalleryProps {
  userId: string;
  onSelectForRegeneration?: (prompt: string, imageUrl: string, generationId: string) => void;
}

export default function GenerationsGallery({ userId, onSelectForRegeneration }: GenerationsGalleryProps) {
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [customizingId, setCustomizingId] = useState<string | null>(null);

  // Fetch user generations on component mount
  useEffect(() => {
    if (userId) {
      loadGenerations();
    }
  }, [userId]);

  // Load generations from Supabase
  const loadGenerations = async () => {
    try {
      setLoading(true);
      const data = await fetchUserGenerations(userId);
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

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Your Generated Images</h2>
      
      {customizingId ? (
        <div className="mb-6">
          {/* Show customizer for the selected image */}
          {generations.filter(gen => gen.id === customizingId).map(gen => (
            <ImageCustomizer
              key={gen.id}
              imageUrl={gen.image_url}
              generationId={gen.id}
              enhancedPrompt={gen.enhanced_prompt}
              onCustomizationComplete={(enhancedPromptExternal) => 
                handleCustomizationComplete(gen.id, enhancedPromptExternal)
              }
            />
          ))}
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => setCustomizingId(null)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generations.map((generation) => (
            <Card key={generation.id} className="overflow-hidden">
              <div className="aspect-square overflow-hidden">
                <img 
                  src={generation.image_url} 
                  alt={`Generated image ${generation.id}`}
                  className="w-full h-full object-cover transition-all hover:scale-105" 
                />
              </div>
              <CardContent className="p-4">
                <p className="text-sm line-clamp-2 h-10">
                  {generation.enhanced_prompt_external || generation.enhanced_prompt}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(generation.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between p-4 pt-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCustomizingId(generation.id)}
                >
                  Customize
                </Button>
                {onSelectForRegeneration && (
                  <Button 
                    size="sm"
                    onClick={() => onSelectForRegeneration(
                      generation.enhanced_prompt_external || generation.enhanced_prompt,
                      generation.image_url,
                      generation.id
                    )}
                  >
                    Regenerate
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 