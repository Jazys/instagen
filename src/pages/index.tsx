import Head from 'next/head'
import { Navbar } from '@/components/layout/Navbar'
import { HeroSection } from '@/components/home/HeroSection'

export default function Home() {
  return (
    <>
      <Head>
        <title>AIFluencer - Create Your Perfect Virtual Influencer</title>
        <meta name="description" content="Generate unique, photorealistic AI influencers for your brand using advanced AI technology." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Navbar />
      <main>
        <HeroSection />
      </main>
    </>
  )
}