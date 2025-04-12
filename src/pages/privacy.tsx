import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/Navbar"
import Head from "next/head"
import { Footer } from "@/components/layout/Footer"

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Instagen</title>
        <meta name="description" content="Privacy Policy for Instagen, a platform for creating virtual influencers" />
      </Head>
      
      <Navbar />
      <main className="pt-24 min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="container py-12">
          <Card className="mx-auto max-w-4xl">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold text-center mb-8">Privacy Policy - Instagen</h1>
              
              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Introduction</h2>
                <p className="text-muted-foreground">
                  At Instagen, the privacy of our users is our top priority. This policy explains how we collect, use, and protect your personal information.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Data Collected</h2>
                <p className="text-muted-foreground">
                  Instagen only collects your email address when creating your user account in order to manage your access to our platform and communicate with you.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Use of Your Personal Data</h2>
                <p className="text-muted-foreground">
                  Your email is exclusively used to:
                </p>
                <ul className="list-disc pl-8 mt-2 text-muted-foreground">
                  <li>Manage your user account.</li>
                  <li>Inform you of any updates or changes to the service.</li>
                  <li>Ensure direct and efficient communication with you.</li>
                </ul>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Security of Your Personal Data</h2>
                <p className="text-muted-foreground">
                  We are committed to implementing all necessary technical and organizational measures to ensure the security and confidentiality of your email address, protecting it against any loss, unauthorized access, or disclosure.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Sharing Your Personal Data</h2>
                <p className="text-muted-foreground">
                  Instagen commits to never sell, rent, or share your email address with third parties for commercial or advertising purposes.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Your Rights Regarding Your Personal Data</h2>
                <p className="text-muted-foreground">
                  In accordance with applicable regulations, you have the right to access, modify, or request the deletion of your email address by contacting us directly.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Policy Modifications</h2>
                <p className="text-muted-foreground">
                  This policy may be modified at any time.
                </p>
              </section>

              <section className="mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Contact</h2>
                <p className="text-muted-foreground">
                  For any questions regarding privacy or the management of your personal data, contact us at:{' '}
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