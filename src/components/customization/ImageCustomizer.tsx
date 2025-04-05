import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateGenerationPrompt } from '@/lib/supabase-storage';

// Types for customization options
export type BackgroundOption = 'nature' | 'urban' | 'beach' | 'studio' | 'mountains' | 'indoor';
export type ClothingColorOption = 'black' | 'white' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink';
export type ActionOption = 'standing' | 'sitting' | 'walking' | 'running' | 'posing' | 'jumping';

interface CustomizationOptions {
  background: BackgroundOption;
  clothingColor: ClothingColorOption;
  action: ActionOption;
}

interface ImageCustomizerProps {
  imageUrl: string;
  generationId?: string; // Optional: only needed if already saved to DB
  enhancedPrompt: string;
  onCustomizationComplete: (enhancedPromptExternal: string, options: CustomizationOptions) => void;
}

export default function ImageCustomizer({
  imageUrl,
  generationId,
  enhancedPrompt,
  onCustomizationComplete
}: ImageCustomizerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CustomizationOptions>({
    background: 'nature',
    clothingColor: 'black',
    action: 'standing'
  });

  // Handle option changes
  const handleOptionChange = (option: keyof CustomizationOptions, value: string) => {
    setOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // Save customization options
  const handleSaveCustomization = async () => {
    try {
      setLoading(true);

      // Create the external prompt by extending the base prompt
      const enhancedPromptExternal = `${enhancedPrompt}, wearing ${options.clothingColor} clothes, ${options.action} in a ${options.background} setting`;

      // If we have a generationId, update the record in the database
      if (generationId) {
        await updateGenerationPrompt(generationId, enhancedPromptExternal);
      }

      // Call the callback with the new prompt
      onCustomizationComplete(enhancedPromptExternal, options);

      toast({
        title: "Customization Saved",
        description: "Your customization options have been saved successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving customization:', error);
      toast({
        title: "Error",
        description: "Failed to save customization options.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Customize Your Image</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <img 
              src={imageUrl} 
              alt="Generated image" 
              className="w-full rounded-md shadow-lg object-cover h-[300px]" 
            />
            
            {/* Add a loading overlay when processing */}
            {loading && (
              <div className="mt-4 py-3 px-4 bg-muted rounded-md flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating new image with your customizations...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Background Selection */}
            <div className="space-y-3">
              <Label>🎬 Background Setting</Label>
              <Select
                value={options.background}
                onValueChange={(value) => handleOptionChange('background', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nature">Nature / Outdoors</SelectItem>
                  <SelectItem value="urban">Urban / City</SelectItem>
                  <SelectItem value="beach">Beach</SelectItem>
                  <SelectItem value="studio">Studio (Professional)</SelectItem>
                  <SelectItem value="mountains">Mountains</SelectItem>
                  <SelectItem value="indoor">Indoor / Home</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clothing Color */}
            <div className="space-y-3">
              <Label>👕 Clothing Color</Label>
              <RadioGroup
                value={options.clothingColor}
                onValueChange={(value) => handleOptionChange('clothingColor', value)}
                className="grid grid-cols-4 gap-2"
                disabled={loading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="black" id="black" disabled={loading} />
                  <Label htmlFor="black" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-black inline-block mr-2"></span>
                    Black
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="white" id="white" disabled={loading} />
                  <Label htmlFor="white" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-white border inline-block mr-2"></span>
                    White
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="red" id="red" disabled={loading} />
                  <Label htmlFor="red" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-red-500 inline-block mr-2"></span>
                    Red
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="blue" id="blue" disabled={loading} />
                  <Label htmlFor="blue" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-blue-500 inline-block mr-2"></span>
                    Blue
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="green" id="green" disabled={loading} />
                  <Label htmlFor="green" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-green-500 inline-block mr-2"></span>
                    Green
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yellow" id="yellow" disabled={loading} />
                  <Label htmlFor="yellow" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-yellow-400 inline-block mr-2"></span>
                    Yellow
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="purple" id="purple" disabled={loading} />
                  <Label htmlFor="purple" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-purple-500 inline-block mr-2"></span>
                    Purple
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pink" id="pink" disabled={loading} />
                  <Label htmlFor="pink" className={`flex items-center ${loading ? 'opacity-50' : ''}`}>
                    <span className="h-4 w-4 rounded-full bg-pink-500 inline-block mr-2"></span>
                    Pink
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Action/Pose */}
            <div className="space-y-3">
              <Label>🧍 Action / Pose</Label>
              <Select
                value={options.action}
                onValueChange={(value) => handleOptionChange('action', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standing">Standing</SelectItem>
                  <SelectItem value="sitting">Sitting</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="posing">Posing (Fashion)</SelectItem>
                  <SelectItem value="jumping">Jumping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveCustomization}
              className={`w-full mt-6 py-6 ${loading ? 'bg-primary-foreground text-primary' : ''}`}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Génération en cours...
                </span>
              ) : (
                "Save & Generate New Image"
              )}
            </Button>
            
            {/* Explain what will happen */}
            <p className="text-xs text-muted-foreground text-center">
              Clicking the button above will generate a new image with your customization choices.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 