import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { useRouter } from 'next/router'

export const Navbar = () => {
  const router = useRouter()

  return (
    <header className='fixed top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container flex h-16 items-center justify-between'>
        <Link href='/' className='flex items-center space-x-2'>
          <span className='text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'>
            Instagen
          </span>
        </Link>

        <NavigationMenu>
          <NavigationMenuList className='hidden md:flex gap-6'>
            <NavigationMenuItem>
              <Link 
                href='/generate' 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  router.pathname === '/generate' ? 'text-primary' : ''
                }`}
              >
                Create
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link 
                href='/gallery' 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  router.pathname === '/gallery' ? 'text-primary' : ''
                }`}
              >
                Gallery
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link 
                href='/pricing' 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  router.pathname === '/pricing' ? 'text-primary' : ''
                }`}
              >
                Pricing
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className='flex items-center gap-4'>
          <Link href='/login'>
            <Button variant='ghost' size='sm'>
              Sign In
            </Button>
          </Link>
          <Link href='/generate'>
            <Button size='sm' className='bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity'>
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}