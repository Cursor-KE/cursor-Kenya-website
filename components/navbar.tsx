'use client'

import { BrandWordmark } from '@/components/brand-wordmark'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CALL_FOR_SPEAKERS_URL } from '@/lib/links'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const baseLinks = [
  { href: '/events', label: 'Events' },
  { href: '/recaps', label: 'Recaps' },
  { href: '/community-posts', label: 'Posts' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/community-showcase', label: 'Showcase' },
  { href: '/about', label: 'About' },
]

function isActive (pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Navbar ({
  showFrameLink = false,
}: {
  showFrameLink?: boolean
}) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const links = showFrameLink
    ? [
        ...baseLinks.slice(0, 1),
        { href: '/getyourcard', label: 'Get your card' },
        ...baseLinks.slice(1),
      ]
    : baseLinks

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Home"
          className="shrink-0 whitespace-nowrap rounded-md text-lg font-semibold tracking-tight text-foreground transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BrandWordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(pathname, l.href) ? 'page' : undefined}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                isActive(pathname, l.href)
                  ? 'bg-white/[0.08] text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={CALL_FOR_SPEAKERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition hover:bg-foreground/90 sm:inline-flex"
          >
            Call for Speakers
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger
              className="lg:hidden"
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              }
            />
            <SheetContent side="right" className="border-border bg-popover">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-2 flex flex-col gap-1 px-4">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={pathname === '/' ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-base font-medium',
                    pathname === '/' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  Home
                </Link>
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive(pathname, l.href) ? 'page' : undefined}
                    className={cn(
                      'rounded-lg px-3 py-2.5 text-base font-medium',
                      isActive(pathname, l.href)
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
                <a
                  href={CALL_FOR_SPEAKERS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-4 inline-flex items-center justify-center gap-1 rounded-full bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Call for Speakers
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
