import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"

export const FaqSection = () => {
  const faqs = [
    {
      question: "How do I earn money with my AI influencers?",
      answer: "You can earn money through multiple revenue streams: selling premium AI-generated photos, partnering with brands for collaborations, creating and selling exclusive content packages, and developing digital products. Our platform provides tools and guidance to help you maximize your earnings potential."
    },
    {
      question: "How long until I start making money?",
      answer: "The timeline varies depending on your engagement and strategy. Some creators start earning within their first month by actively creating content and building their following. Success typically comes from consistent content creation, engagement with followers, and strategic use of our monetization tools."
    },
    {
      question: "Is there a limit to how many followers my AI influencer can have?",
      answer: "There's no technical limit to the number of followers your AI influencer can attract. Your growth potential depends on your content quality, engagement strategy, and how well you connect with your target audience. We provide tools and analytics to help you grow your following effectively."
    },
    {
      question: "Is Instagen suitable for all types of AI influencers?",
      answer: "Yes, Instagen is designed to accommodate all AI influencer styles. Whether you want to create a lifestyle, fashion, travel, or any other type of personality, our platform offers the customization tools needed to bring your unique vision to life."
    },
    {
      question: "How long does it take to generate my AI influencer?",
      answer: "The initial generation process takes about 15 minutes to create a complete personality, including basic profile setup and initial content generation. Our streamlined process ensures you can start your AI influencer journey quickly and efficiently."
    },
    {
      question: "What if I cancel my subscription?",
      answer: "If you cancel your subscription, you'll continue to have access to your account and features until the end of your current billing period. After that, your account will revert to the free tier with limited features. You can reactivate your premium features at any time by resubscribing."
    }
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-background to-background/95">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find answers to common questions about creating and monetizing your AI influencer
          </p>
        </div>

        <Card className="max-w-3xl mx-auto p-6 shadow-lg">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-border last:border-0">
                <AccordionTrigger className="text-left hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </section>
  )
}