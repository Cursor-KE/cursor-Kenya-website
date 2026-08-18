import Link from 'next/link'
import { marketingFooterLinks, withOptionalFrameLink } from '@/lib/marketing/nav'

export function Footer ({
  showFrameLink = false,
}: {
  showFrameLink?: boolean
}) {
  const links = withOptionalFrameLink(marketingFooterLinks, showFrameLink)

  return (
    <footer className="border-t border-border/80 bg-background/80 py-12 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          Cursor Kenya — a developer community built around AI-assisted coding.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
