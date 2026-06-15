import { cn } from '@/lib/utils'

export function AdminPageShell ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-7 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 xl:px-10',
        className
      )}
    >
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/45 px-4 py-4 shadow-[0_24px_80px_rgb(0_0_0/0.18)] backdrop-blur sm:px-5 lg:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-primary/85">
              Admin
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      <div className={cn('min-w-0 flex flex-col gap-6', contentClassName)}>{children}</div>
    </div>
  )
}
