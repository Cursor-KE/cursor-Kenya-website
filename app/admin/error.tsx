'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function AdminError ({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h1 className="text-xl font-semibold text-foreground">Admin error</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <div className="mt-6 flex gap-3">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Retry
        </Button>
        <Link href="/admin" className={cn(buttonVariants({ variant: 'ghost' }))}>
          Dashboard
        </Link>
      </div>
    </div>
  )
}
