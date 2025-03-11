
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export const HeroSection = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-background/95">
      <div className="container px-4 md:px-6 flex flex-col items-center text-center gap-8 pt-24">
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium">AI-Powered Influencer Generation</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter max-w-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
          Create Your Perfect Virtual Influencer with AI
        </h1>
        
        <p className="text-muted-foreground text-lg md:text-xl max-w-[700px]">
          Generate unique, photorealistic AI influencers for your brand. Customize their style, personality, and aesthetic with our advanced AI technology.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            Start Creating <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline">
            View Gallery
          </Button>
        </div>

        <div className="w-full max-w-5xl aspect-[2/1] rounded-lg border bg-muted/50 mt-12">
          {/* Placeholder for AI Generated Preview */}
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            AI Preview Placeholder
          </div>
        </div>
      </div>
    </div>
  )
}
