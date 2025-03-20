import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export const EarningsCalculator = () => {
  const [mounted, setMounted] = useState(false)
  const [followers, setFollowers] = useState([1000])
  const [subscriptionPrice, setSubscriptionPrice] = useState([9.99])
  const [conversionRate, setConversionRate] = useState([2])
  const [averageTips, setAverageTips] = useState([5])

  useEffect(() => {
    setMounted(true)
  }, [])

  const calculateEarnings = () => {
    const monthlySubscribers = Math.floor((followers[0] * conversionRate[0]) / 100)
    const subscriptionRevenue = monthlySubscribers * subscriptionPrice[0]
    const tipsRevenue = monthlySubscribers * averageTips[0]
    return {
      total: subscriptionRevenue + tipsRevenue,
      subscribers: monthlySubscribers,
      subscriptionRevenue,
      tipsRevenue
    }
  }

  const earnings = calculateEarnings()

  if (!mounted) {
    return null
  }

  return (
    <section className="py-24 bg-muted/50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Calculate Your Potential Earnings</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how much you could earn through subscriptions and tips with your AI influencer
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Adjust Your Metrics</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Total Followers</Label>
                      <span className="font-medium text-lg">{followers[0].toLocaleString()}</span>
                    </div>
                    <Slider
                      value={followers}
                      onValueChange={setFollowers}
                      min={100}
                      max={100000}
                      step={100}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Subscription Price ($/month)</Label>
                      <span className="font-medium text-lg">${subscriptionPrice[0].toFixed(2)}</span>
                    </div>
                    <Slider
                      value={subscriptionPrice}
                      onValueChange={setSubscriptionPrice}
                      min={0.99}
                      max={99.99}
                      step={0.5}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Subscriber Conversion Rate (%)</Label>
                      <span className="font-medium text-lg">{conversionRate[0]}%</span>
                    </div>
                    <Slider
                      value={conversionRate}
                      onValueChange={setConversionRate}
                      min={0.1}
                      max={10}
                      step={0.1}
                      className="py-4"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Average Tips ($/month)</Label>
                      <span className="font-medium text-lg">${averageTips[0]}</span>
                    </div>
                    <Slider
                      value={averageTips}
                      onValueChange={setAverageTips}
                      min={0}
                      max={50}
                      step={1}
                      className="py-4"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Estimated Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-8">
                <div className="text-center p-8 bg-muted rounded-lg">
                  <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ${earnings.total.toFixed(2)}
                  </div>
                  <div className="text-muted-foreground mt-2">Per Month</div>
                </div>

                <div className="bg-muted p-6 rounded-lg text-center">
                  <div className="text-lg text-muted-foreground mb-2">Monthly Subscribers</div>
                  <div className="text-4xl font-semibold text-primary">{earnings.subscribers}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-6 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-2">Subscription Revenue</div>
                    <div className="text-2xl font-semibold">${earnings.subscriptionRevenue.toFixed(2)}</div>
                  </div>

                  <div className="bg-muted p-6 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-2">Tips Revenue</div>
                    <div className="text-2xl font-semibold">${earnings.tipsRevenue.toFixed(2)}</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  * Earnings are estimates based on average user data and may vary based on content quality, engagement, and market conditions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <Button 
            asChild
            size="lg" 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg px-12 py-8 h-auto rounded-xl hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
          >
            <Link href="/auth/register" className="flex items-center gap-3 text-xl">
              Start Your AI Influencer Journey
              <ArrowRight className="w-6 h-6" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}