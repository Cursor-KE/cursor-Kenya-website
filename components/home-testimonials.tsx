import { BRAND } from '@/lib/brand'
import { Quote } from 'lucide-react'
import { FadeIn } from '@/components/motion-fade'
import { getPublishedTestimonials } from '@/lib/queries'

export async function HomeTestimonials () {
  let items: Awaited<ReturnType<typeof getPublishedTestimonials>> = []
  try {
    items = await getPublishedTestimonials(9)
  } catch {
    return null
  }

  if (items.length === 0) return null

  return (
    <section className="border-t border-border/60 bg-card/15 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            What attendees are saying
          </h2>
          <p className="mt-2 text-muted-foreground">Highlights from feedback after recent events.</p>
        </FadeIn>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex flex-col rounded-2xl border border-border bg-card/50 p-6 transition hover:border-primary/40"
            >
              <Quote className="size-5 text-primary" aria-hidden />
              {t.question ? (
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.question}
                </p>
              ) : null}
              <blockquote className="mt-2 flex-1 text-base leading-relaxed text-foreground">
                “{t.quote}”
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t.attendeeName ?? `A ${BRAND.name} attendee`}
                </span>
                {t.attendeeRole ? <span> · {t.attendeeRole}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
