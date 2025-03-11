
import { Card, CardContent } from "@/components/ui/card"
import { BadgeCheck, Image, DollarSign, Instagram, BrainCircuit } from "lucide-react"

export const FeaturesSection = () => {
  const features = [
    {
      icon: <BrainCircuit className="w-12 h-12 text-purple-600" />,
      title: "Create Your AI Influencer",
      description: "Design your perfect virtual influencer using our advanced AI technology. Customize appearance, style, and personality.",
      step: 1
    },
    {
      icon: <Instagram className="w-12 h-12 text-pink-600" />,
      title: "Generate Social Content",
      description: "Create engaging content for Instagram, TikTok, and more. Our AI helps you maintain consistent posting and engagement.",
      step: 2
    },
    {
      icon: <DollarSign className="w-12 h-12 text-purple-600" />,
      title: "Monetize Your Influence",
      description: "Sell AI-generated photos and collaborate with brands. Turn your virtual influence into real revenue.",
      step: 3
    }
  ]

  return (
    <section className="py-24 bg-muted/50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your Journey to Virtual Influence
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Follow our proven three-step process to create, grow, and monetize your AI influencer presence
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <Card key={i} className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary">{feature.step}</span>
              </div>
              <CardContent className="pt-8 pb-6 px-6">
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
