import { ArrowUpRight } from 'lucide-react'
import { FadeIn } from '@/components/motion-fade'
import { CALL_FOR_SPEAKERS_URL } from '@/lib/links'

const ARTWORK_ALT =
  'Call for Speakers poster: the Cursor cube logo next to a cluster of five colourful Grok Bot characters, ' +
  'the headline "Call for Speakers" with the line "Cursor × Grok Bot", and a QR code above the caption ' +
  '"Apply via the link". The QR code opens the speaker application form.'


export function HomeCallForSpeakers () {
  return (
    <section
      id="call-for-speakers"
      aria-labelledby="cfs-heading"
      className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-card/60 p-6 sm:p-10 md:grid-cols-2 lg:gap-16 lg:p-14">
          <FadeIn className="order-2 md:order-1">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Now open</p>
            <h2 id="cfs-heading" className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Call for Speakers
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Have a workflow, a project or a lesson learned worth sharing? Pitch a talk for an upcoming
              meetup and help other builders across Kenya ship faster.
            </p>
            <a
              href={CALL_FOR_SPEAKERS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_var(--glow-strong)] transition hover:bg-primary/90 sm:text-base"
            >
              Apply to speak
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </FadeIn>
          <FadeIn delay={0.1} className="order-1 md:order-2">
            <picture>
              <source media="(min-width: 768px)" srcSet="/speakers/call-for-speakers-1x1.png" width={1080} height={1080} />
              <img
                src="/speakers/call-for-speakers-4x5.png"
                width={1080}
                height={1350}
                alt={ARTWORK_ALT}
                loading="lazy"
                decoding="async"
                className="mx-auto h-auto w-full max-w-md rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40"
              />
            </picture>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
