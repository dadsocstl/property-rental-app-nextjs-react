'use client';

import { BrandLockup } from '@/components/BrandLogo';
import profileDefault from '@/assets/images/profile.png';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/context/SessionContext';
import { cn } from '@/lib/utils';
import { Bell, Bookmark, Building2, CreditCard, LogOut, Menu, Plus, User, UserRoundCog, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import UnreadMessageCount from './UnreadMessageCount';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/properties', label: 'Properties' },
  { href: '/properties/add', label: 'Add Property', auth: true },
  { href: '/renter', label: 'My Rent', auth: true },
];

const Navbar = () => {
  const { session, status, openSignIn, signOut, isDevBypass } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => setIsMobileMenuOpen(false), [pathname]);

  const links = NAV_LINKS.filter((link) => !link.auth || session);

  return (
    <header className='sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md'>
      <nav className='container flex h-20 items-center justify-between gap-4' aria-label='Main'>
        <div className='flex items-center gap-10'>
          <Link href='/' className='flex shrink-0 items-center rounded-lg'>
            <BrandLockup priority />
          </Link>
          <ul className='hidden items-center gap-1 md:flex'>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                    pathname === link.href && 'bg-secondary text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className='flex items-center gap-2'>
          {isDevBypass && (
            <span className='hidden rounded-full border border-dashed border-primary/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary lg:inline'>
              Dev mode
            </span>
          )}

          {status === 'unauthenticated' && (
            <Button onClick={openSignIn} className='hidden md:inline-flex'>
              <User />
              Login or Register
            </Button>
          )}

          {session && (
            <>
              <Link
                href='/messages'
                className='relative flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'
              >
                <Bell className='size-5' />
                <span className='sr-only'>Messages</span>
                <UnreadMessageCount />
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className='rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                  <Image
                    className='size-9 rounded-full border-2 border-primary object-cover'
                    src={session.user.image || profileDefault}
                    alt=''
                    width={36}
                    height={36}
                  />
                  <span className='sr-only'>Open user menu</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuLabel className='normal-case tracking-normal'>
                    <span className='block text-sm text-foreground'>{session.user.username}</span>
                    <span className='block text-xs font-normal text-muted-foreground'>{session.user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {session.user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href='/admin'>
                        <Building2 /> Management
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href='/renter'>
                      <CreditCard /> My Rent
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/profile'>
                      <User /> Your Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/properties/saved'>
                      <Bookmark /> Saved Properties
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/properties/add'>
                      <Plus /> Add Property
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isDevBypass && (
                    <DropdownMenuItem onSelect={openSignIn}>
                      <UserRoundCog /> Switch dev account
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => signOut().then(() => router.push('/'))}>
                    <LogOut /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <Button
            variant='ghost'
            size='icon'
            className='md:hidden'
            aria-controls='mobile-menu'
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
            <span className='sr-only'>Toggle main menu</span>
          </Button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div id='mobile-menu' className='border-t border-border/60 md:hidden'>
          <ul className='container flex flex-col gap-1 py-4'>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'block rounded-lg px-4 py-3 font-medium text-muted-foreground',
                    pathname === link.href && 'bg-secondary text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {status === 'unauthenticated' && (
              <li className='pt-2'>
                <Button onClick={openSignIn} className='w-full'>
                  <User /> Login or Register
                </Button>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;
