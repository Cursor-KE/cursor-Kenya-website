import { ArrowRight } from 'lucide-react'
import { CountdownTimer } from '@/components/countdown-timer'
import { EventCard } from '@/components/event-card'
import { HomeGalleryMosaic } from '@/components/home-gallery-mosaic'
import { FadeIn } from '@/components/motion-fade'
import { FeaturedVideosClient } from '@/components/featured-videos-client'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getNextUpcomingEvent, getLumaEventsSafe } from '@/lib/luma/client'
import { HomeCommunityShowcase } from '@/components/home-community-showcase'
import { getFeaturedVideos, getHomeFeaturedImages } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { Suspense } from 'react'

export const revalidate = 60

async function HeroCountdown () {
  const next = await getNextUpcomingEvent()
  return (
    <div className="mt-12">
      <p className="mb-4 text-center text-sm font-medium uppercase tracking-[0.2em] text-primary">
        Next Cursor Kenya Event
      </p>
      <CountdownTimer targetIso={next?.startAt ?? null} />
    </div>
  )
}

async function EventsStrip () {
  const all = await getLumaEventsSafe()
  const now = Date.now()
  const upcoming = all
    .filter((e) => new Date(e.startAt).getTime() > now)
    .slice(0, 3)

  if (upcoming.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No upcoming events listed yet. Check back soon.
      </p>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {upcoming.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  )
}

async function FeaturedVideos () {
  try {
    const list = await getFeaturedVideos()
    return <FeaturedVideosClient videos={list} />
  } catch {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Connect the database to load featured videos.
      </p>
    )
  }
}

async function FeaturedPhotos () {
  const photos = await getHomeFeaturedImages(9)
  return <HomeGalleryMosaic photos={photos} />
}

export default function HomePage () {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgb(245_78_0/0.18),transparent)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <FadeIn>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl sm:leading-[1.05]">
              Cursor Kenya
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Meetups, hackathons, and workshops for builders across Kenya using Cursor and AI to build
              and ship faster.
            </p>
          </FadeIn>

          <Suspense
            fallback={
              <div className="mt-12 flex justify-center gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-24 rounded-2xl" />
                ))}
              </div>
            }
          >
            <HeroCountdown />
          </Suspense>

          <FadeIn delay={0.1} className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/events"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'rounded-xl bg-gradient-to-r from-primary to-primary-end px-8 text-primary-foreground shadow-[0_0_40px_-8px_var(--glow-strong)] transition hover:scale-[1.02] hover:opacity-95'
              )}
            >
              View events
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'rounded-xl border-border/80 bg-card/40'
              )}
            >
              About the community
            </Link>
          </FadeIn>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="border-t border-border/60 px-4 py-16 sm:px-6">
            <Skeleton className="mx-auto h-[min(420px,55vh)] max-w-6xl rounded-3xl" />
          </div>
        }
      >
        <FeaturedPhotos />
      </Suspense>

      <section className="border-t border-border/60 bg-card/20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Upcoming events
            </h2>
            <p className="mt-2 text-muted-foreground">
              Pulled from our Luma calendar — revalidated every minute.
            </p>
          </FadeIn>
          <div className="mt-10">
            <Suspense
              fallback={
                <div className="grid gap-6 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-80 rounded-2xl" />
                  ))}
                </div>
              }
            >
              <EventsStrip />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Featured videos
            </h2>
            <p className="mt-2 text-muted-foreground">Curated talks and recordings from the community.</p>
          </FadeIn>
          <div className="mt-10">
            <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
              <FeaturedVideos />
            </Suspense>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <HomeCommunityShowcase />
      </Suspense>
    </div>
  )
}
