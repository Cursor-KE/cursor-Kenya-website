import { PublicEventsWebMCP } from '@/components/public-events-webmcp'
import { BRAND } from '@/lib/brand'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { CountdownTimer } from '@/components/countdown-timer'
import { EventCard } from '@/components/event-card'
import { HomeGalleryMosaic } from '@/components/home-gallery-mosaic'
import { FadeIn } from '@/components/motion-fade'
import { FeaturedVideosClient } from '@/components/featured-videos-client'
import { HomePartners } from '@/components/home-partners'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { getNextUpcomingEvent, getUpcomingLumaEvents } from '@/lib/luma/client'
import { HomeCommunityShowcase } from '@/components/home-community-showcase'
import { HomeTestimonials } from '@/components/home-testimonials'
import { getFeaturedVideos, getHomeFeaturedImages } from '@/lib/queries'
import { CALL_FOR_SPEAKERS_URL } from '@/lib/links'
import { HomeCallForSpeakers } from '@/components/home-call-for-speakers'
import { Suspense } from 'react'

export const revalidate = 60

async function HeroCountdown () {
  const next = await getNextUpcomingEvent()
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-card/60 p-6 backdrop-blur-md sm:p-8">
      <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Next {BRAND.name} Event
      </p>
      <CountdownTimer targetIso={next?.startAt ?? null} className="justify-start" />
      {next ? (
        <p className="mt-6 line-clamp-2 text-sm text-foreground/90">{next.title}</p>
      ) : null}
    </div>
  )
}

function SectionHeading ({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </FadeIn>
  )
}

async function EventsStrip () {
  const upcoming = await getUpcomingLumaEvents(3)

  if (upcoming.length === 0) {
    return (
      <>
        <PublicEventsWebMCP events={upcoming} scope="homepage-upcoming-preview" loadedAt={new Date().toISOString()} />
        <p className="text-center text-muted-foreground">
          No upcoming events listed yet. Check back soon.
        </p>
      </>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <PublicEventsWebMCP events={upcoming} scope="homepage-upcoming-preview" loadedAt={new Date().toISOString()} />
      {upcoming.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  )
}

async function FeaturedVideos () {
  const list = await getFeaturedVideos().catch(() => null)
  if (!list || list.length === 0) return null

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title="Featured videos" description="Curated talks and recordings from the community." />
        <div className="mt-10">
          <FeaturedVideosClient videos={list} />
        </div>
      </div>
    </section>
  )
}

async function FeaturedPhotos () {
  const photos = await getHomeFeaturedImages(9)
  return <HomeGalleryMosaic photos={photos} />
}

export default function HomePage () {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_-10%,rgb(245_78_0/0.22),transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <FadeIn>
            <a
              href={CALL_FOR_SPEAKERS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground sm:text-sm"
            >
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">New</span>
              Speaker applications are open
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <h1 className="mt-6 text-5xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl lg:leading-[1.02]">
              {BRAND.name}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Meetups, hackathons, and workshops for builders across Kenya using Cursor and AI to build
              and ship faster.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--glow-strong)] transition hover:bg-primary/90 sm:text-base"
              >
                View events
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a
                href={CALL_FOR_SPEAKERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-foreground transition hover:border-white/25 hover:bg-white/[0.06] sm:text-base"
              >
                Call for Speakers
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Suspense
              fallback={<Skeleton className="h-56 w-full rounded-3xl" />}
            >
              <HeroCountdown />
            </Suspense>
          </FadeIn>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="Upcoming events"
            action={
              <Link href="/events" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                All events
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            }
          />
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

      <HomeCallForSpeakers />

      <Suspense
        fallback={
          <div className="px-4 py-16 sm:px-6">
            <Skeleton className="mx-auto h-[min(420px,55vh)] max-w-6xl rounded-3xl" />
          </div>
        }
      >
        <FeaturedPhotos />
      </Suspense>

      <Suspense fallback={null}>
        <FeaturedVideos />
      </Suspense>

      <Suspense fallback={null}>
        <HomeCommunityShowcase />
      </Suspense>

      <Suspense fallback={null}>
        <HomeTestimonials />
      </Suspense>

      <HomePartners />
    </div>
  )
}
