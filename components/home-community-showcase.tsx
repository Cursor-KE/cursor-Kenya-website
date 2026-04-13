import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { getFeaturedCommunityShowcase } from '@/lib/queries'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import { cn } from '@/lib/utils'

export async function HomeCommunityShowcase () {
  let items: Awaited<ReturnType<typeof getFeaturedCommunityShowcase>> = []
  try {
    items = await getFeaturedCommunityShowcase(4)
  } catch {
    return null
  }

  if (items.length === 0) return null

  return (
    <section className="border-t border-border/60 bg-card/15 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Community showcase
            </h2>
            <p className="mt-2 text-muted-foreground">Shipped with Cursor by builders in Kenya.</p>
          </div>
          <Link
            href="/community-showcase"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'shrink-0 rounded-xl border-border/80'
            )}
          >
            View all & submit
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => {
            const thumb = p.screenshotUrls[0]
            return (
              <li key={p.id}>
                <Link
                  href="/community-showcase"
                  className="group block overflow-hidden rounded-2xl border border-border bg-card/50 transition hover:border-primary/40"
                >
                  {thumb ? (
                    <div className="relative aspect-[16/10] bg-muted">
                      <Image
                        src={cloudinaryScaledUrl(thumb, 480)}
                        alt=""
                        fill
                        className="object-cover transition group-hover:opacity-95"
                        sizes="(max-width: 640px) 100vw, 25vw"
                        unoptimized
                      />
                    </div>
                  ) : null}
                  <div className="p-4">
                    <p className="font-medium text-foreground line-clamp-2 group-hover:text-primary">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.builderName}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
