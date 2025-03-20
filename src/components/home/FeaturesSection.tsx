import { Card, CardContent } from "@/components/ui/card"
import Image from 'next/image'
import { EarningsCalculator } from './EarningsCalculator'

export const FeaturesSection = () => {
  const steps = [
    {
      title: 'Design Your Character',
      description: 'Choose from a wide range of physical attributes and personality traits to create a unique digital persona, complete with a bio that sets the stage for meaningful interactions.',
      image: '/photo-8-m84j64ee.jpeg',
      imageLeft: true
    },
    {
      title: 'Generate Content',
      description: 'Utilize our user-friendly tools to effortlessly craft posts, images, and videos. It\'s simple and straightforward, no steep learning curve involved.',
      image: '/photo-6-m84jbhjp.jpeg',
      imageLeft: false
    },
    {
      title: 'Spread the Word',
      description: 'Share your digital persona across social media platforms, online communities, or wherever potential fans hang out.',
      image: '/photo-7-m84jo0h1.jpeg',
      imageLeft: true
    },
    {
      title: 'Monetize Your Influence',
      description: 'Turn your virtual influence into real revenue through brand collaborations, content sales, and exclusive partnerships.',
      image: '/photo-8-m84j64ee.jpeg',
      imageLeft: false
    }
  ]

  return (
    <>
      <section className="py-24 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your Journey to Virtual Influence
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Follow our proven four-step process to create, grow, and monetize your AI influencer presence
            </p>
          </div>

          <div className="space-y-24">
            {steps.map((step, i) => (
              <div key={i} className={`flex flex-col ${step.imageLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center`}>
                <div className='w-full md:w-1/2'>
                  <div className='relative aspect-[4/5] rounded-xl overflow-hidden'>
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className='object-cover'
                      sizes='(max-width: 768px) 100vw, 50vw'
                    />
                  </div>
                </div>
                <div className='w-full md:w-1/2 space-y-4'>
                  <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-xl mb-4'>
                    {i + 1}
                  </div>
                  <h3 className='text-2xl font-bold'>{step.title}</h3>
                  <p className='text-muted-foreground text-lg'>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <EarningsCalculator />
    </>
  )
}