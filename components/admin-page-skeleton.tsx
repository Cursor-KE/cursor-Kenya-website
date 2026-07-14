import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function AdminMetricCardsSkeleton ({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex min-h-40 flex-col gap-4 rounded-xl border border-border/70 bg-card/65 p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-24" />
          <Skeleton className="mt-auto h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function AdminTableSkeleton ({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border/70 bg-card/60 p-5', className)}>
      <div className="flex flex-col gap-2 pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-3"
          >
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
            <Skeleton className="hidden h-4 w-16 sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminContentSkeleton ({
  variant = 'default',
}: {
  variant?: 'default' | 'metrics' | 'table' | 'dashboard'
}) {
  if (variant === 'metrics') {
    return (
      <div className="flex flex-col gap-6">
        <AdminMetricCardsSkeleton count={5} className="sm:grid-cols-2 xl:grid-cols-5" />
        <AdminTableSkeleton rows={5} />
      </div>
    )
  }

  if (variant === 'table') {
    return <AdminTableSkeleton />
  }

  if (variant === 'dashboard') {
    return (
      <div className="flex flex-col gap-6">
        <AdminMetricCardsSkeleton />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <AdminTableSkeleton rows={5} />
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border/70 bg-card/50 p-5">
              <Skeleton className="mb-4 h-5 w-28" />
              <Skeleton className="mb-3 h-12 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="rounded-xl border border-border/70 bg-card/50 p-5">
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminMetricCardsSkeleton count={3} className="md:grid-cols-3 xl:grid-cols-3" />
      <AdminTableSkeleton />
    </div>
  )
}

export function AdminPageLoadingSkeleton () {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 xl:px-10">
      <div className="sr-only" role="status" aria-live="polite">
        Loading admin page
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/45 px-4 py-4 sm:px-5 lg:px-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <AdminContentSkeleton />
    </div>
  )
}
