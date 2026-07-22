import Image from 'next/image'
import { FadeIn } from '@/components/motion-fade'
import { cn } from '@/lib/utils'

const partners = [
  {
    name: 'Cursor',
    logo: '/frame-card-assets/cursor-lockup.svg',
    width: 173,
    height: 41,
    imageClassName: 'h-12 w-auto invert dark:invert-0 sm:h-14',
  },
  {
    name: 'GitHub',
    logo: '/partners/github.png',
    width: 341,
    height: 428,
    imageClassName: 'h-28 w-auto dark:invert sm:h-32',
  },
  {
    name: 'Sentry',
    logo: '/partners/sentry.png',
    width: 362,
    height: 93,
    imageClassName: 'h-12 w-auto dark:invert sm:h-14',
  },
  {
    name: 'PayHero',
    logo: '/partners/payhero.png',
    width: 158,
    height: 115,
    imageClassName: 'h-20 w-auto sm:h-24',
  },
] as const

export function HomePartners () {
  return (
    <section
      aria-labelledby="partners-heading"
      className="border-t border-border/60 px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <FadeIn className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Our ecosystem
          </p>
          <h2
            id="partners-heading"
            className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Past partners &amp; sponsors
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            We&apos;re grateful to the organizations that have supported the Cursor Kenya community.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
            {partners.map((partner) => (
              <li
                key={partner.name}
                className="flex min-h-44 items-center justify-center bg-background p-8"
              >
                <Image
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  width={partner.width}
                  height={partner.height}
                  className={cn('object-contain', partner.imageClassName)}
                  sizes="(min-width: 640px) 25vw, 60vw"
                />
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  )
}
