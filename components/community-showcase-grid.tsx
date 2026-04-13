import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { communityShowcase } from '@/db/schema'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import { cn } from '@/lib/utils'

export type ShowcaseRow = typeof communityShowcase.$inferSelect

export function CommunityShowcaseGrid ({
  projects,
  className,
}: {
  projects: ShowcaseRow[]
  className?: string
}) {
  if (projects.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No approved projects yet. Be the first to submit yours above.
      </p>
    )
  }

  return (
    <ul className={cn('grid gap-8 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {projects.map((p) => (
        <li
          key={p.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card/50 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-0.5 bg-muted/40">
            {p.screenshotUrls.slice(0, 4).map((url, i) => (
              <div key={`${p.id}-shot-${i}`} className="relative aspect-video overflow-hidden bg-muted">
                <Image
                  src={cloudinaryScaledUrl(url, 640)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  unoptimized
                />
              </div>
            ))}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-semibold text-foreground">{p.title}</h3>
            <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{p.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">Built by {p.builderName}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={p.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-95"
              >
                Open project
                <ExternalLink className="h-3 w-3" />
              </Link>
              {p.repoUrl ? (
                <Link
                  href={p.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  Code
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
