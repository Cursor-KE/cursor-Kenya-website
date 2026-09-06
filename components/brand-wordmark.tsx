import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'

/** Original community wordmark, using the site's existing typography and palette. */
export function BrandWordmark ({ className }: { className?: string }) {
  return <span className={cn('inline-block whitespace-nowrap font-semibold tracking-tight', className)}>
    {BRAND.wordmark}<span aria-hidden="true" className="text-primary">.</span>{' '}
    <span className="text-muted-foreground">{BRAND.location}</span>
  </span>
}
