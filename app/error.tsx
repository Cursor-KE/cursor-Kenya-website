'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function GlobalError ({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">{error.message}</p>
      <div className="mt-6 flex gap-3">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Link
          href="/"
          className={cn(buttonVariants(), 'bg-gradient-to-r from-primary to-primary-end text-primary-foreground')}
        >
          Home
        </Link>
      </div>
    </div>
  )
}
