import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export const HeroSection = () => {
  return (
    <div className='relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-background/95'>
      <div className='container px-4 md:px-6 flex flex-col items-center text-center gap-8 pt-24'>
        <div className='flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full'>
          <Sparkles className='w-4 h-4 text-purple-500' />
          <span className='text-sm font-medium'>The Future of Digital Influence</span>
        </div>
        
        <h1 className='text-4xl md:text-6xl font-bold tracking-tighter max-w-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent'>
          Create, Grow, and Monetize Your AI Influencer Empire
        </h1>
        
        <p className='text-muted-foreground text-lg md:text-xl max-w-[700px]'>
          Design your perfect virtual influencer, create engaging social media content, and earn revenue through brand collaborations and photo sales.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 w-full justify-center'>
          <Button size='lg' className='bg-gradient-to-r from-purple-600 to-pink-600 text-white'>
            Start Creating <ArrowRight className='ml-2 w-4 h-4' />
          </Button>
          <Button size='lg' variant='outline'>
            View Success Stories
          </Button>
        </div>

        <div className='w-full max-w-5xl aspect-[2/1] rounded-lg border bg-muted/50 mt-12 overflow-hidden'>
          <div className='w-full h-full flex items-center justify-center text-muted-foreground'>
            {/* Add a grid of AI-generated influencer examples */}
            <div className='grid grid-cols-3 gap-4 p-4 w-full h-full'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='aspect-square rounded-lg bg-muted flex items-center justify-center'>
                  Example {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}