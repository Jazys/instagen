import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneratorForm } from "@/components/generator/GeneratorForm"
import { PreviewSection } from "@/components/generator/PreviewSection"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import Head from "next/head"
import { useState } from 'react'
import Link from 'next/link'

export default function GeneratePage() {
  const [currentImage, setCurrentImage] = useState('/photo-8-m84j64ee.jpeg')

  return (
    <>
      <Head>
        <title>Create Your AI Influencer - AIFluencer</title>
        <meta name='description' content='Generate and customize your perfect AI influencer with our advanced AI technology.' />
      </Head>
      
      <Navbar />
      <main className='pt-24 min-h-screen bg-gradient-to-b from-background to-background/95'>
        <div className='container py-8'>
          <div className='flex justify-between items-center mb-8'>
            <h1 className='text-3xl font-bold'>AI Influencer Generator</h1>
            <div className='flex gap-4'>
              <Button 
                onClick={() => setCurrentImage('/photo-8-m84j64ee.jpeg')}
                className='bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              >
                Generate Photo
              </Button>
              <Button 
                variant='outline'
                className='border-purple-600 text-purple-600 hover:bg-purple-50'
                asChild
              >
                <Link href='/gallery'>
                  Gallery
                </Link>
              </Button>
            </div>
          </div>
          <div className='flex flex-col md:flex-row gap-8'>
            <div className='w-full md:w-1/3'>
              <GeneratorForm onGenerate={setCurrentImage} />
            </div>
            <div className='w-full md:w-2/3'>
              <PreviewSection currentImage={currentImage} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}