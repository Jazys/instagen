import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

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
    <section className='py-24 bg-muted/50'>
      <div className='container'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold mb-4'>Calculate Your Potential Earnings</h2>
          <p className='text-muted-foreground text-lg max-w-2xl mx-auto'>
            See how much you could earn through subscriptions and tips with your AI influencer
          </p>
        </div>

        <div className='grid md:grid-cols-2 gap-8 items-start'>
          <Card>
            <CardHeader>
              <CardTitle>Adjust Your Metrics</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <Label>Total Followers</Label>
                    <span className='font-medium'>{followers[0].toLocaleString()}</span>
                  </div>
                  <Slider
                    value={followers}
                    onValueChange={setFollowers}
                    min={100}
                    max={100000}
                    step={100}
                  />
                </div>

                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <Label>Subscription Price ($/month)</Label>
                    <span className='font-medium'>${subscriptionPrice[0].toFixed(2)}</span>
                  </div>
                  <Slider
                    value={subscriptionPrice}
                    onValueChange={setSubscriptionPrice}
                    min={0.99}
                    max={99.99}
                    step={0.5}
                  />
                </div>

                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <Label>Subscriber Conversion Rate (%)</Label>
                    <span className='font-medium'>{conversionRate[0]}%</span>
                  </div>
                  <Slider
                    value={conversionRate}
                    onValueChange={setConversionRate}
                    min={0.1}
                    max={10}
                    step={0.1}
                  />
                </div>

                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <Label>Average Tips per Subscriber ($/month)</Label>
                    <span className='font-medium'>${averageTips[0]}</span>
                  </div>
                  <Slider
                    value={averageTips}
                    onValueChange={setAverageTips}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estimated Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-center mb-8'>
                <div className='text-5xl font-bold text-primary mb-2'>
                  ${earnings.total.toFixed(2)}
                </div>
              </div>

              <div className='space-y-6'>
                <div className='bg-muted p-4 rounded-lg'>
                  <div className='text-xl font-semibold mb-1'>Monthly Subscribers</div>
                  <div className='text-2xl text-primary'>{earnings.subscribers}</div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-muted p-4 rounded-lg'>
                    <div className='text-sm text-muted-foreground mb-1'>Subscription Revenue</div>
                    <div className='text-xl font-semibold'>${earnings.subscriptionRevenue.toFixed(2)}</div>
                  </div>

                  <div className='bg-muted p-4 rounded-lg'>
                    <div className='text-sm text-muted-foreground mb-1'>Tips Revenue</div>
                    <div className='text-xl font-semibold'>${earnings.tipsRevenue.toFixed(2)}</div>
                  </div>
                </div>

                <p className='text-xs text-muted-foreground mt-4'>
                  * Earnings are estimates based on average user data and may vary based on content quality, engagement, and market conditions. Platform fees will be deducted from the total earnings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}