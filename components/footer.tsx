import { BrandWordmark } from '@/components/brand-wordmark'
import { BRAND } from '@/lib/brand'
import { CALL_FOR_SPEAKERS_URL } from '@/lib/links'
import Link from 'next/link'

export function Footer ({
  showFrameLink = false,
}: {
  showFrameLink?: boolean
}) {
  const links = [
    { href: '/events', label: 'Events' },
    ...(showFrameLink ? [{ href: '/getyourcard', label: 'Get your card' }] : []),
    { href: '/recaps', label: 'Recaps' },
    { href: '/community-posts', label: 'Posts' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/community-showcase', label: 'Showcase' },
    { href: '/about', label: 'About' },
  ]

  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="max-w-sm">
          <Link href="/" aria-label="Home" className="text-lg text-foreground">
            <BrandWordmark />
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {BRAND.name} — a volunteer-led developer community built around AI-assisted development.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground md:justify-end">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <a
            href={CALL_FOR_SPEAKERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground transition hover:text-primary"
          >
            Call for Speakers<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </footer>
  )
}
