import Head from 'next/head'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/components/home/HeroSection'
import { FeaturesSection } from '@/components/home/FeaturesSection'
import { MonetizationSection } from '@/components/home/MonetizationSection'
import { FaqSection } from '@/components/home/FaqSection'

export default function Home() {
  return (
    <>
      <Head>
        <title>Instagen - Create Your Perfect Virtual Influencer</title>
        <meta name="description" content="Generate unique, photorealistic AI influencers and monetize through social media and brand collaborations." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Navbar />
      <main>
        <HeroSection />
        <MonetizationSection />
        <FeaturesSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  )
}