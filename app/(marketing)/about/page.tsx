import { FadeIn } from '@/components/motion-fade'

export const metadata = {
  title: 'About | Cursor Kenya',
  description: 'The story behind the Cursor Kenya developer community.',
}

export default function AboutPage () {
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-16">
        <FadeIn>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">About Cursor Kenya</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Cursor Kenya is a volunteer-led community for developers who build with AI-assisted tools — especially{' '}
            <span className="text-foreground">Cursor</span>. We run meetups, deep-dives, and casual hangs where people
            share workflows, plugins, and honest lessons from shipping real software.
          </p>
        </FadeIn>

        <FadeIn>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">What we care about</h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Practical craft: editor setup, agents, testing, and code review in the age of LLMs.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Inclusive spaces: newcomers and seniors learn together — no gatekeeping.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              Local roots, global perspective — Nairobi builders connected to the wider Cursor ecosystem.
            </li>
          </ul>
        </FadeIn>

        <FadeIn>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Get involved</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Join an upcoming event on the Events page, say hi in the hallway track, or propose a talk. We&apos;re
            always looking for hosts, sponsors, and demo nights.
          </p>
        </FadeIn>
      </div>
    </div>
  )
}
