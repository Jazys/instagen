
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneratorForm } from "@/components/generator/GeneratorForm"
import { PreviewSection } from "@/components/generator/PreviewSection"
import { Navbar } from "@/components/layout/Navbar"
import Head from "next/head"

export default function GeneratePage() {
  return (
    <>
      <Head>
        <title>Create Your AI Influencer - AIFluencer</title>
        <meta name="description" content="Generate and customize your perfect AI influencer with our advanced AI technology." />
      </Head>
      
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
              <GeneratorForm />
            </div>
            <div className="w-full md:w-2/3">
              <PreviewSection />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
