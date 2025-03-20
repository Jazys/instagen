
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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
      question: "Instagen convient à tous les type d'influenceuse IA ?",
      answer: "Oui, Instagen est conçu pour s'adapter à tous les styles d'influenceurs IA. Que vous souhaitiez créer une personnalité lifestyle, mode, voyage, ou autre, notre plateforme offre les outils de personnalisation nécessaires pour réaliser votre vision unique."
    },
    {
      question: "Combien de temps faut il pour générer mon influenceuse ?",
      answer: "La génération initiale de votre influenceuse prend quelques minutes. Cependant, pour créer une personnalité complète avec un portfolio varié, comptez environ 1-2 heures pour personnaliser tous les aspects et générer un premier ensemble de contenu de qualité."
    },
    {
      question: "What if I cancel my subscription?",
      answer: "If you cancel your subscription, you'll continue to have access to your account and features until the end of your current billing period. After that, your account will revert to the free tier with limited features. You can reactivate your premium features at any time by resubscribing."
    }
  ]

  return (
    <section className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find answers to common questions about creating and monetizing your AI influencer
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
