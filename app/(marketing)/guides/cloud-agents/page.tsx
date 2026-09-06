import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  GitPullRequest,
  ShieldCheck,
} from 'lucide-react'
import { CopyPromptButton } from '@/components/copy-prompt-button'
import { FadeIn } from '@/components/motion-fade'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  CLOUD_AGENTS_URL,
  cloudAgentCapabilities,
  cloudAgentPromptTemplates,
  cloudAgentSafetyChecks,
  cloudAgentWorkflow,
  cloudAgentsPage,
} from '@/lib/guides/cloud-agents'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: cloudAgentsPage.title,
  description: cloudAgentsPage.description,
}

const sectionLinks = [
  { href: '#workflow', label: 'Workflow' },
  { href: '#prompts', label: 'Prompts' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#safety', label: 'Safety' },
] as const

export default function CloudAgentsGuidePage () {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_55%_55%_at_50%_0%,var(--glow),transparent_72%)] opacity-40" />

      <section className="relative px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {cloudAgentsPage.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl sm:leading-[1.05]">
              {cloudAgentsPage.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {cloudAgentsPage.description}
            </p>
          </FadeIn>

          <FadeIn delay={0.08} className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={CLOUD_AGENTS_URL}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'rounded-xl bg-gradient-to-r from-primary to-primary-end px-6 text-primary-foreground shadow-[0_0_40px_-8px_var(--glow-strong)] transition hover:scale-[1.02] hover:opacity-95'
              )}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open Cloud Agents
              <ArrowRight className="ml-1 size-4" />
            </Link>
            <Link
              href="#workflow"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'rounded-xl border-border/80 bg-card/40'
              )}
            >
              See the workflow
            </Link>
          </FadeIn>

          <nav
            aria-label="On this page"
            className="mt-10 flex flex-wrap gap-2"
          >
            {sectionLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-border/70 bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section
        id="workflow"
        aria-labelledby="workflow-heading"
        className="relative border-t border-border/60 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Four steps
            </p>
            <h2
              id="workflow-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              A clear path from prompt to merge
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Treat the agent like a teammate in a clean workspace: give it a repo, a tight brief, then review the evidence before you merge.
            </p>
          </FadeIn>

          <ol className="mt-10 grid gap-5 md:grid-cols-2">
            {cloudAgentWorkflow.map((item, index) => (
              <li key={item.step}>
                <FadeIn delay={index * 0.05}>
                  <article className="h-full rounded-2xl border border-border/70 bg-card/55 p-6 sm:p-7">
                    <span className="font-mono text-xs text-primary">
                      STEP {String(item.step).padStart(2, '0')}
                    </span>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.summary}
                    </p>
                  </article>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="prompts"
        aria-labelledby="prompts-heading"
        className="border-t border-border/60 bg-card/20 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Prompt templates
            </p>
            <h2
              id="prompts-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Copy a prompt, then tighten the brackets
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              These are practical starting points for shipping a feature, fixing a bug, and repairing CI. Replace the bracketed notes with your actual scope.
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {cloudAgentPromptTemplates.map((template, index) => (
              <FadeIn key={template.id} delay={index * 0.05}>
                <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/60 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Badge variant="outline" className="bg-background/40">
                        Template {String(index + 1).padStart(2, '0')}
                      </Badge>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                        {template.title}
                      </h3>
                    </div>
                    <CopyPromptButton text={template.prompt} label={template.title} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {template.useWhen}
                  </p>
                  <pre className="mt-5 flex-1 overflow-x-auto rounded-xl border border-border/70 bg-background/70 p-4 font-mono text-[0.78rem] leading-6 text-foreground/90 whitespace-pre-wrap">
                    <code>{template.prompt}</code>
                  </pre>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section
        id="capabilities"
        aria-labelledby="capabilities-heading"
        className="border-t border-border/60 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Capabilities
            </p>
            <h2
              id="capabilities-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              What Cloud Agents can do
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Use them for bounded implementation work — not for handing over production keys or skipping review.
            </p>
          </FadeIn>

          <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cloudAgentCapabilities.map((item, index) => (
              <li key={item.title}>
                <FadeIn delay={index * 0.04}>
                  <article className="h-full rounded-2xl border border-border/70 bg-card/50 p-6">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                      <Bot className="size-4" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.detail}
                    </p>
                  </article>
                </FadeIn>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="safety"
        aria-labelledby="safety-heading"
        className="border-t border-border/60 bg-card/20 px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Review checklist
            </p>
            <h2
              id="safety-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Review and safety
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Isolated environments reduce blast radius. They do not replace a careful look at diffs, tests, permissions, and secrets.
            </p>
          </FadeIn>

          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {cloudAgentSafetyChecks.map((item) => (
              <li
                key={item.title}
                className="flex gap-4 rounded-2xl border border-border/70 bg-card/55 p-5"
              >
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="cta-heading"
        className="border-t border-border/60 px-4 py-16 sm:px-6 sm:py-20"
      >
        <FadeIn>
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border/70 bg-card/60 px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Ready when you are
                </span>
                <h2
                  id="cta-heading"
                  className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                  Start a Cloud Agent, then come back to review
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Launch an isolated run, keep working, and merge only after the artifacts look right.
                </p>
              </div>
              <Link
                href={CLOUD_AGENTS_URL}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'rounded-xl bg-gradient-to-r from-primary to-primary-end px-6 text-primary-foreground shadow-[0_0_40px_-8px_var(--glow-strong)]'
                )}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GitPullRequest className="size-4" />
                Go to cursor.com/agents
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  )
}
