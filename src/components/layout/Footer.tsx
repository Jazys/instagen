
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  const legalLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" }
  ]

  return (
    <footer className="border-t bg-white">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="flex items-center gap-6">
            {legalLinks.map((link, i) => (
              <Button key={i} variant="link" className="text-muted-foreground hover:text-primary" asChild>
                <Link href={link.href}>
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>

          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Instagen
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            © {currentYear} Instagen. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
