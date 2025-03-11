
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wand2 } from "lucide-react"

export const GeneratorForm = () => {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = () => {
    setGenerating(true)
    // Simulate generation
    setTimeout(() => setGenerating(false), 3000)
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
              <Slider defaultValue={[25]} min={18} max={45} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Slider defaultValue={[170]} min={150} max={190} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Build</Label>
              <Slider defaultValue={[50]} min={0} max={100} step={1} />
            </div>
          </TabsContent>
          
          <TabsContent value="style" className="space-y-4">
            <div className="space-y-2">
              <Label>Fashion Style</Label>
              <Input placeholder="e.g. Streetwear, Bohemian, Minimalist" />
            </div>
            <div className="space-y-2">
              <Label>Color Palette</Label>
              <Input placeholder="e.g. Warm earth tones, Pastels" />
            </div>
          </TabsContent>
          
          <TabsContent value="personality" className="space-y-4">
            <div className="space-y-2">
              <Label>Personality Traits</Label>
              <Input placeholder="e.g. Confident, Friendly, Adventurous" />
            </div>
            <div className="space-y-2">
              <Label>Content Style</Label>
              <Input placeholder="e.g. Travel, Fashion, Lifestyle" />
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
