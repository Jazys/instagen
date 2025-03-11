import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useRouter } from 'next/router'

export const Navbar = () => {
  const router = useRouter()

  return (
    <header className='fixed top-0 w-full border-b bg-background z-50'>
      <div className='container flex h-16 items-center justify-between'>
        <Link href='/' className='flex items-center space-x-2'>
          <span className='text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'>
            Instagen
          </span>
        </Link>

        <div className='hidden md:flex gap-6'>
          <Button variant='ghost' asChild>
            <Link 
              href='/generate'
              className={router.pathname === '/generate' ? 'text-primary' : ''}
            >
              Create
            </Link>
          </Button>
          <Button variant='ghost' asChild>
            <Link 
              href='/gallery'
              className={router.pathname === '/gallery' ? 'text-primary' : ''}
            >
              Gallery
            </Link>
          </Button>
          <Button variant='ghost' asChild>
            <Link 
              href='/pricing'
              className={router.pathname === '/pricing' ? 'text-primary' : ''}
            >
              Pricing
            </Link>
          </Button>
        </div>

        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' asChild>
            <Link href='/login'>
              Sign In
            </Link>
          </Button>
          <Button size='sm' className='bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity' asChild>
            <Link href='/generate'>
              Get Started
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}