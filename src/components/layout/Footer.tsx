
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react"

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  const sections = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Generate", href: "/generate" }
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" }
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "#" },
        { label: "Documentation", href: "#" },
        { label: "Support", href: "#" }
      ]
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Cookie Policy", href: "#" }
      ]
    }
  ]

  const socialLinks = [
    { icon: Facebook, href: "#" },
    { icon: Twitter, href: "#" },
    { icon: Instagram, href: "#" },
    { icon: Linkedin, href: "#" },
    { icon: Youtube, href: "#" }
  ]

  return (
    <footer className="border-t bg-white">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-primary" asChild>
                      <Link href={link.href}>
                        {link.label}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t">
          <div className="flex items-center mb-4 md:mb-0">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Instagen
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {socialLinks.map((social, i) => {
              const Icon = social.icon
              return (
                <Button key={i} variant="ghost" size="icon" className="rounded-full" asChild>
                  <Link href={social.href}>
                    <Icon className="w-5 h-5" />
                  </Link>
                </Button>
              )
            })}
          </div>

          <div className="text-sm text-muted-foreground mt-4 md:mt-0">
            © {currentYear} Instagen. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
