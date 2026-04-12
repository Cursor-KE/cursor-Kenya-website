'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Part = { label: string; value: number }

function pad (n: number) {
  return n.toString().padStart(2, '0')
}

type Remaining =
  | null
  | { kind: 'pending' }
  | { kind: 'done' }
  | { kind: 'remaining'; days: number; hours: number; minutes: number; seconds: number }

function useRemaining (target: Date | null): Remaining {
  // Defer Date.now() until after mount so SSR and hydration paint match (avoids
  // server/client clock skew and tick-boundary mismatches).
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return useMemo(() => {
    if (!target) return null
    if (now === null) return { kind: 'pending' as const }
    const diff = target.getTime() - now
    if (diff <= 0) {
      return { kind: 'done' as const }
    }
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = Math.floor((diff % (60 * 1000)) / 1000)
    return { kind: 'remaining' as const, days, hours, minutes, seconds }
  }, [target, now])
}

function DigitBox ({ value, label }: Part) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'relative flex min-w-[4.5rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/90 bg-card/60 px-4 py-4 shadow-[0_0_32px_-8px_var(--glow),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-md sm:min-w-[5.5rem]'
        )}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl"
          >
            {label === 'Seconds' || label === 'Minutes' || label === 'Hours' ? pad(value) : value}
          </motion.span>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary-end/10" />
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function CountdownTimer ({
  targetIso,
  className,
}: {
  targetIso: string | null
  className?: string
}) {
  const target = targetIso ? new Date(targetIso) : null
  const parts = useRemaining(target)

  if (!targetIso || !parts) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-border/80 bg-card/40 px-8 py-10 text-center backdrop-blur-md',
          className
        )}
      >
        <p className="text-lg font-medium text-foreground">Next event — TBA</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll announce the date soon. Stay tuned.
        </p>
      </div>
    )
  }

  if (parts.kind === 'done') {
    return (
      <div className={cn('rounded-2xl border border-border bg-card/50 px-8 py-8 text-center', className)}>
        <p className="text-lg font-semibold text-foreground">We&apos;re live — join us!</p>
      </div>
    )
  }

  if (parts.kind === 'pending') {
    const labels = ['Days', 'Hours', 'Minutes', 'Seconds'] as const
    return (
      <div
        className={cn(
          'flex flex-wrap items-end justify-center gap-4 sm:gap-6',
          className
        )}
      >
        {labels.map((label) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'relative flex min-w-[4.5rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/90 bg-card/60 px-4 py-4 shadow-[0_0_32px_-8px_var(--glow),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-md sm:min-w-[5.5rem]'
              )}
            >
              <Skeleton className="h-9 w-10 rounded-md sm:h-11 sm:w-12" />
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary-end/10" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const items: Part[] = [
    { label: 'Days', value: parts.days },
    { label: 'Hours', value: parts.hours },
    { label: 'Minutes', value: parts.minutes },
    { label: 'Seconds', value: parts.seconds },
  ]

  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-center gap-4 sm:gap-6',
        className
      )}
    >
      {items.map((p) => (
        <DigitBox key={p.label} {...p} />
      ))}
    </div>
  )
}
