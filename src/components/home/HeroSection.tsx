import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Image from 'next/image'
import Link from 'next/link'
import { ImagePreviewModal } from '@/components/gallery/ImagePreviewModal'
import { useState } from 'react'

export const HeroSection = () => {
  const examples = [
    '/photo-8-m84j64ee.jpeg',
    '/photo-6-m84jbhjp.jpeg',
    '/photo-7-m84jo0h1.jpeg'
  ]

  const [selectedImage, setSelectedImage] = useState<string | null>(null)

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
          <Link href='/generate'>
            <Button size='lg' className='bg-gradient-to-r from-purple-600 to-pink-600 text-white'>
              Start Creating <ArrowRight className='ml-2 w-4 h-4' />
            </Button>
          </Link>
        </div>

        <div className='w-full max-w-5xl mt-12 overflow-hidden'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {examples.map((src, i) => (
              <div 
                key={i} 
                className='relative aspect-[4/5] rounded-lg overflow-hidden cursor-pointer'
                onClick={() => setSelectedImage(src)}
              >
                <Image
                  src={src}
                  alt={`AI Influencer Example ${i + 1}`}
                  fill
                  className='object-cover hover:scale-105 transition-transform duration-300'
                  sizes='(max-width: 768px) 100vw, 33vw'
                />
              </div>
            ))}
          </div>
        </div>

        {selectedImage && (
          <ImagePreviewModal
            isOpen={!!selectedImage}
            onClose={() => setSelectedImage(null)}
            imageSrc={selectedImage}
          />
        )}
      </div>
    </div>
  )
}