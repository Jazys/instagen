import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/Navbar"
import Head from "next/head"
import { Footer } from "@/components/layout/Footer"

export default function CookiePolicyPage() {
  return (
    <>
      <Head>
        <title>Cookie Policy - Instagen</title>
        <meta name="description" content="Cookie Policy for Instagen, a platform for creating virtual influencers" />
      </Head>
      
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container py-12">
          <Card className="mx-auto max-w-4xl">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold text-center mb-8">Cookie Policy - Instagen</h1>
              
              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Introduction</h2>
                <p className="text-muted-foreground">
                  This Cookie Policy explains how Instagen uses cookies and similar technologies to recognize you when you visit our website and application. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">What Are Cookies</h2>
                <p className="text-muted-foreground">
                  Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Why We Use Cookies</h2>
                <p className="text-muted-foreground">
                  We use cookies for the following purposes:
                </p>
                <ul className="list-disc pl-8 mt-2 text-muted-foreground">
                  <li>To enable certain functions of the Service</li>
                  <li>To authenticate users and prevent fraudulent use of user accounts</li>
                  <li>To store your preferences</li>
                  <li>To analyze how our Service is used so that we can improve it</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Types of Cookies We Use</h2>
                <p className="text-muted-foreground">
                  The cookies we use can be classified into the following categories:
                </p>
                <ul className="list-disc pl-8 mt-2 text-muted-foreground">
                  <li><span className="font-medium">Essential Cookies:</span> These cookies are necessary for the website to function properly and cannot be switched off in our systems.</li>
                  <li><span className="font-medium">Performance Cookies:</span> These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site.</li>
                  <li><span className="font-medium">Functional Cookies:</span> These cookies enable the website to provide enhanced functionality and personalization.</li>
                  <li><span className="font-medium">Targeting Cookies:</span> These cookies may be set through our site by our advertising partners. They may be used to build a profile of your interests and show you relevant adverts on other sites.</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">How to Control Cookies</h2>
                <p className="text-muted-foreground">
                  You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted. As the means by which you can refuse cookies through your web browser controls vary from browser to browser, you should visit your browser's help menu for more information.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Third-Party Cookies</h2>
                <p className="text-muted-foreground">
                  In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service and deliver advertisements on and through the Service.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Updates to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. We encourage you to periodically review this Cookie Policy to stay informed about our use of cookies.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Contact</h2>
                <p className="text-muted-foreground">
                  If you have any questions about our use of cookies or other technologies, please contact us at:{' '}
                  <a href="mailto:support@instagen.ai" className="text-primary hover:underline">
                    support@instagen.ai
                  </a>
                </p>
              </section>
              
              <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Instagen. All rights reserved.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
} 