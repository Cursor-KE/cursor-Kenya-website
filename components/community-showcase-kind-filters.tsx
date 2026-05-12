import Link from 'next/link'
import {
  SHOWCASE_PROJECT_KIND_LABELS,
  SHOWCASE_PROJECT_KIND_VALUES,
  type ShowcaseProjectKind,
} from '@/lib/showcase/project-kind'
import { cn } from '@/lib/utils'

function filterHref (kind: ShowcaseProjectKind | null) {
  return kind == null ? '/community-showcase' : `/community-showcase?kind=${kind}`
}

export function CommunityShowcaseKindFilters ({
  activeKind,
  counts,
  total,
}: {
  activeKind: ShowcaseProjectKind | null
  counts: Record<ShowcaseProjectKind, number>
  total: number
}) {
  return (
    <div className="flex max-w-xl flex-wrap items-center justify-end gap-2 sm:max-w-none">
      <Link
        href={filterHref(null)}
        scroll={false}
        className={cn(
          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          activeKind == null
            ? 'border-primary/60 bg-primary/15 text-foreground'
            : 'border-border/80 bg-background/40 text-muted-foreground hover:border-primary/35 hover:text-foreground'
        )}
      >
        All{total > 0 ? ` (${total})` : ''}
      </Link>
      {SHOWCASE_PROJECT_KIND_VALUES.map((kind) => {
        const n = counts[kind]
        const active = activeKind === kind
        return (
          <Link
            key={kind}
            href={filterHref(kind)}
            scroll={false}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary/60 bg-primary/15 text-foreground'
                : 'border-border/80 bg-background/40 text-muted-foreground hover:border-primary/35 hover:text-foreground'
            )}
          >
            {SHOWCASE_PROJECT_KIND_LABELS[kind]}
            {n > 0 ? ` (${n})` : ''}
          </Link>
        )
      })}
    </div>
  )
}
