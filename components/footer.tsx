import Link from 'next/link'

export function Footer () {
  return (
    <footer className="border-t border-border/80 bg-background/80 py-12 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          Cursor Kenya — a developer community built around AI-assisted coding.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/events" className="hover:text-foreground">
            Events
          </Link>
          <Link href="/gallery" className="hover:text-foreground">
            Gallery
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
        </div>
      </div>
    </footer>
  )
}
