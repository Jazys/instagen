import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Share2, Heart } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PreviewSectionProps {
  currentImage: string
  generatedPrompt?: string
}

export const PreviewSection = ({ currentImage, generatedPrompt }: PreviewSectionProps) => {
  const [liked, setLiked] = useState(false)

  const handleDownload = () => {
    // Create an anchor element and trigger download
    const link = document.createElement('a')
    link.href = currentImage
    link.download = `instagen-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: 'Image Downloaded',
      description: 'Your image has been downloaded successfully!'
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My AI-generated Influencer',
        text: 'Check out this AI influencer I created with Instagen!',
        url: currentImage
      })
    } else {
      // Fallback for browsers that don't support navigator.share
      toast({
        title: 'Share',
        description: 'Share functionality is not supported in your browser.'
      })
    }
  }

  const handleLike = () => {
    setLiked(!liked)
    toast({
      title: liked ? 'Removed from favorites' : 'Added to favorites',
      description: liked 
        ? 'This image has been removed from your favorites.' 
        : 'This image has been added to your favorites!'
    })
  }

  return (
    <div className="sticky top-24 space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative pb-[100%]">
            <img 
              src={currentImage} 
              alt="Generated influencer" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="p-4 flex justify-between items-center">
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleLike}
              className={liked ? 'text-red-500 border-red-200 hover:text-red-600' : ''}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedPrompt && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              <div className="font-semibold mb-1">Prompt utilisé:</div>
              <div className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-32">
                {generatedPrompt}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}