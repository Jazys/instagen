import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { Navbar } from "@/components/layout/Navbar"
import Head from "next/head"
import { ComparisonTable } from '@/components/pricing/ComparisonTable'
import { Footer } from "@/components/layout/Footer"
import Link from "next/link"

export default function PricingPage() {
  const tiers = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for exploring AI influencer creation",
      features: [
        "Create 1 AI influencer",
        "Basic customization options",
        "5 AI-generated photos",
        "Community support"
      ],
      cta: "Get Started",
      highlight: false
    },
    {
      name: "Professional",
      price: "$19.99 to $59.99",
      period: "per pack",
      description: "Ideal for serious content creators",
      features: [
        "Create 3 AI influencers",
        "Advanced customization options",
        "Up to 300 AI-generated photos",
        "Priority support",
        "Brand collaboration tools",
        "Analytics dashboard"
      ],
      cta: "Start Pro Plan",
      highlight: true
    }
  ]

  return (
    <>
      <Head>
        <title>Pricing - AIFluencer</title>
        <meta name="description" content="Choose the perfect plan for your AI influencer journey. From individual creators to enterprise solutions." />
      </Head>
      
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container py-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-muted-foreground text-lg">
              Choose the perfect plan for your AI influencer journey. All plans include our core features.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {tiers.map((tier, i) => (
              <Card 
                key={i} 
                className={`relative ${
                  tier.highlight 
                    ? "border-2 border-primary shadow-lg scale-105" 
                    : ""
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 rounded-full text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className="text-muted-foreground ml-2">{tier.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/auth/register" passHref className="w-full">
                    <Button 
                      className={`w-full ${
                        tier.highlight 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" 
                          : ""
                      }`}
                      variant={tier.highlight ? "default" : "outline"}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className='mt-16'>
            <h2 className='text-2xl font-bold mb-6 text-center'>Compare All Features</h2>
            <ComparisonTable />
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Enterprise Solutions</h2>
            <p className="text-muted-foreground mb-6">
              Need a custom solution? We offer tailored packages for large organizations.
            </p>
            <Link href="/login" passHref>
              <Button variant="outline" size="lg">
                Contact Enterprise Sales
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}