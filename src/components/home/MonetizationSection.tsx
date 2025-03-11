
import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, ShoppingBag, Camera, Trophy } from "lucide-react"

export const MonetizationSection = () => {
  const monetizationMethods = [
    {
      icon: <Camera className="w-8 h-8 text-purple-600" />,
      title: "Premium Photo Sales",
      description: "Sell exclusive AI-generated photos to your followers"
    },
    {
      icon: <ShoppingBag className="w-8 h-8 text-pink-600" />,
      title: "Brand Collaborations",
      description: "Partner with brands for sponsored content and promotions"
    },
    {
      icon: <Trophy className="w-8 h-8 text-purple-600" />,
      title: "Exclusive Content",
      description: "Create and sell premium content packages"
    },
    {
      icon: <DollarSign className="w-8 h-8 text-pink-600" />,
      title: "Digital Products",
      description: "Develop and sell digital products and merchandise"
    }
  ]

  return (
    <section className="py-24">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Multiple Revenue Streams
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform your AI influencer into a profitable business with diverse income sources
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {monetizationMethods.map((method, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4">{method.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{method.title}</h3>
                <p className="text-muted-foreground text-sm">{method.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
