
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/layout/Navbar"
import { Search, Filter } from "lucide-react"
import Head from "next/head"

export default function GalleryPage() {
  return (
    <>
      <Head>
        <title>AI Influencer Gallery - AIFluencer</title>
        <meta name="description" content="Explore our gallery of AI-generated influencers and find inspiration for your next virtual personality." />
      </Head>
      
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container py-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h1 className="text-3xl font-bold">AI Influencer Gallery</h1>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input className="pl-10" placeholder="Search influencers..." />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-[4/5] bg-muted/50 flex items-center justify-center">
                      <span className="text-muted-foreground">Influencer {i + 1}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button variant="outline" size="lg">
                Load More
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
