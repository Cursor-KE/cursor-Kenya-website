'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, ExternalLink } from 'lucide-react'
import type { CommunityEvent } from '@/lib/luma/types'
import { cn } from '@/lib/utils'

function formatRange (start: string, end: string | null) {
  const s = new Date(start)
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
  if (!end) return s.toLocaleString(undefined, opts)
  const e = new Date(end)
  return `${s.toLocaleString(undefined, opts)} — ${e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

export function EventCard ({ event, className }: { event: CommunityEvent; className?: string }) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
      <Link
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex flex-col overflow-hidden rounded-2xl border border-border/90 bg-card/50 shadow-[0_0_0_1px_rgb(255_255_255/0.04)] backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-[0_0_40px_-12px_var(--glow-strong)]',
          className
        )}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {event.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverUrl}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary-end/10 text-muted-foreground">
              <Calendar className="h-10 w-10 opacity-40" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-foreground">
            {event.title}
          </h3>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            {formatRange(event.startAt, event.endAt)}
          </p>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
            View on Luma
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
