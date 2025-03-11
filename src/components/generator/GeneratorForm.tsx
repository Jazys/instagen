import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wand2 } from "lucide-react"
import { generateImage, GenerationConfig } from "@/services/imageGeneration"
import { toast } from '@/hooks/use-toast'

interface GeneratorFormProps {
  onGenerate: (imageUrl: string) => void
}

export const GeneratorForm = ({ onGenerate }: GeneratorFormProps) => {
  const [generating, setGenerating] = useState(false)
  const [config, setConfig] = useState<GenerationConfig>({
    age: 25,
    height: 170,
    build: 50,
    fashionStyle: '',
    colorPalette: '',
    personalityTraits: '',
    contentStyle: ''
  })

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      const result = await generateImage(config)
      onGenerate(result.imageUrl)
      toast({
        title: 'Image Generated',
        description: 'Your AI influencer has been created successfully!'
      })
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate image. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Customize Your Influencer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
            <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
            <TabsTrigger value="personality" className="flex-1">Personality</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appearance" className="space-y-4">
            <div className="space-y-2">
              <Label>Age Range</Label>
              <Slider 
                value={[config.age]} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, age: value[0] }))}
                min={18} 
                max={45} 
                step={1} 
              />
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Slider 
                value={[config.height]} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, height: value[0] }))}
                min={150} 
                max={190} 
                step={1} 
              />
            </div>
            <div className="space-y-2">
              <Label>Build</Label>
              <Slider 
                value={[config.build]} 
                onValueChange={(value) => setConfig(prev => ({ ...prev, build: value[0] }))}
                min={0} 
                max={100} 
                step={1} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="style" className="space-y-4">
            <div className="space-y-2">
              <Label>Fashion Style</Label>
              <Input 
                placeholder="e.g. Streetwear, Bohemian, Minimalist"
                value={config.fashionStyle}
                onChange={(e) => setConfig(prev => ({ ...prev, fashionStyle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Color Palette</Label>
              <Input 
                placeholder="e.g. Warm earth tones, Pastels"
                value={config.colorPalette}
                onChange={(e) => setConfig(prev => ({ ...prev, colorPalette: e.target.value }))}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="personality" className="space-y-4">
            <div className="space-y-2">
              <Label>Personality Traits</Label>
              <Input 
                placeholder="e.g. Confident, Friendly, Adventurous"
                value={config.personalityTraits}
                onChange={(e) => setConfig(prev => ({ ...prev, personalityTraits: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Content Style</Label>
              <Input 
                placeholder="e.g. Travel, Fashion, Lifestyle"
                value={config.contentStyle}
                onChange={(e) => setConfig(prev => ({ ...prev, contentStyle: e.target.value }))}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          size="lg"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 animate-pulse" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Generate Influencer
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}