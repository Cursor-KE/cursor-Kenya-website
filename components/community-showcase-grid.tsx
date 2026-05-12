import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { communityShowcase } from '@/db/schema'
import { SHOWCASE_PROJECT_KIND_LABELS, normalizeStoredProjectKind } from '@/lib/showcase/project-kind'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import { cn } from '@/lib/utils'

export type ShowcaseRow = typeof communityShowcase.$inferSelect

export function CommunityShowcaseGrid ({
  projects,
  className,
  emptyFilterMessage,
}: {
  projects: ShowcaseRow[]
  className?: string
  /** When filtering returns no rows but the grid is still shown. */
  emptyFilterMessage?: string
}) {
  if (projects.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        {emptyFilterMessage ??
          'No approved projects yet. Be the first to submit yours above.'}
      </p>
    )
  }

  return (
    <ul
      className={cn(
        'grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8',
        className
      )}
    >
      {projects.map((p) => {
        const thumb = p.screenshotUrls[0]
        return (
          <li
            key={p.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="relative h-44 w-full shrink-0 sm:h-48 lg:h-52">
              {thumb ? (
                <Image
                  src={cloudinaryScaledUrl(thumb, 800)}
                  alt=""
                  fill
                  className="object-contain object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <Badge variant="outline" className="mb-2 w-fit border-border/80 font-normal text-muted-foreground">
                {SHOWCASE_PROJECT_KIND_LABELS[normalizeStoredProjectKind(p.projectKind)]}
              </Badge>
              <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground transition group-hover:text-primary sm:text-lg">
                {p.title}
              </h3>
              <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
              <div className="mt-auto space-y-3 pt-5">
                <p className="text-xs leading-normal text-muted-foreground">
                  Built by {p.builderName}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={p.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'xs' }),
                      'rounded-lg'
                    )}
                  >
                    Open project
                    <ExternalLink className="size-3" />
                  </Link>
                  {p.repoUrl ? (
                    <Link
                      href={p.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'xs' }),
                        'rounded-lg border-border/80'
                      )}
                    >
                      Code
                      <ExternalLink className="size-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
