import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wand2 } from "lucide-react"
import { generateImage, GenerationConfig } from "@/services/imageGeneration"
import { toast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface GeneratorFormProps {
  onGenerate: (imageUrl: string) => void
}

export const GeneratorForm = ({ onGenerate }: GeneratorFormProps) => {
  const [mounted, setMounted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [imageFormat, setImageFormat] = useState('portrait')
  const [config, setConfig] = useState<GenerationConfig>({
    background: '',
    action: '',
    emotion: '',
    cameraShot: '',
    cameraAngle: '',
    bodyShape: '',
    breastSize: '',
    clothing: '',
    clothingColor: '',
    age: 25,
    height: 170,
    build: 50,
    fashionStyle: '',
    colorPalette: '',
    personalityTraits: '',
    contentStyle: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const formatSizes = {
    portrait: '832×1216',
    square: '1024×1024',
    landscape: '1216×832'
  }

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
    <Card className='sticky top-24 space-y-6'>
      <div className='flex w-full border-b'>
        {Object.entries(formatSizes).map(([format, size]) => (
          <button
            key={format}
            onClick={() => setImageFormat(format)}
            className={`flex-1 px-4 py-3 text-center transition-colors ${
              imageFormat === format ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className='font-medium capitalize'>{format}</div>
            <div className='text-xs text-muted-foreground'>{size}</div>
          </button>
        ))}
      </div>

      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label>Background</Label>
            <Select defaultValue='studio'>
              <SelectTrigger>
                <SelectValue placeholder='Select background' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='studio'>Studio</SelectItem>
                <SelectItem value='outdoor'>Outdoor</SelectItem>
                <SelectItem value='urban'>Urban</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>Action</Label>
            <Select defaultValue='posing'>
              <SelectTrigger>
                <SelectValue placeholder='Select action' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='posing'>Posing</SelectItem>
                <SelectItem value='walking'>Walking</SelectItem>
                <SelectItem value='sitting'>Sitting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label>Camera Shot</Label>
            <Select defaultValue='full'>
              <SelectTrigger>
                <SelectValue placeholder='Select shot type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='full'>Full Body</SelectItem>
                <SelectItem value='half'>Half Body</SelectItem>
                <SelectItem value='close'>Close Up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>Camera Angle</Label>
            <Select defaultValue='front'>
              <SelectTrigger>
                <SelectValue placeholder='Select angle' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='front'>Front View</SelectItem>
                <SelectItem value='side'>Side View</SelectItem>
                <SelectItem value='high'>High Angle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          className='w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white'
          size='lg'
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <span className='flex items-center gap-2'>
              <Wand2 className='w-4 h-4 animate-pulse' />
              Generating...
            </span>
          ) : (
            <span className='flex items-center gap-2'>
              <Wand2 className='w-4 h-4' />
              Generate {imageFormat}
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}