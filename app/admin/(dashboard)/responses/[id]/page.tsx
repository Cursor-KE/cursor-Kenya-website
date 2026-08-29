import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'
import { AdminPageShell } from '@/components/admin-page-shell'
import { buttonVariants } from '@/components/ui/button'
import { db } from '@/db'
import { formResponses, forms, testimonials } from '@/db/schema'
import { requireApprovedAdmin } from '@/lib/auth/session'
import { formDefinitionSchema, type FormBlock } from '@/lib/forms/types'
import {
  AnswerTestimonialControls,
  type ExistingTestimonial,
} from './answer-testimonial-controls'

function formatAnswer (value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default async function AdminResponseDetailPage ({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireApprovedAdmin()

  const { id } = await params

  const rows = await db
    .select({
      id: formResponses.id,
      formId: formResponses.formId,
      answers: formResponses.answers,
      submitterMeta: formResponses.submitterMeta,
      createdAt: formResponses.createdAt,
      formTitle: forms.title,
      formSlug: forms.slug,
      formDefinition: forms.definition,
    })
    .from(formResponses)
    .leftJoin(forms, eq(formResponses.formId, forms.id))
    .where(eq(formResponses.id, id))
    .limit(1)

  const response = rows[0]
  if (!response) notFound()

  const parsed = formDefinitionSchema.safeParse(response.formDefinition)
  const blocks: FormBlock[] = parsed.success ? parsed.data.blocks : []
  const answers = (response.answers ?? {}) as Record<string, unknown>

  const knownIds = new Set(blocks.map((b) => b.id))
  const orphanAnswers = Object.entries(answers).filter(([key]) => !knownIds.has(key))

  const existingTestimonials = await db
    .select({
      id: testimonials.id,
      blockId: testimonials.blockId,
      attendeeName: testimonials.attendeeName,
      attendeeRole: testimonials.attendeeRole,
      published: testimonials.published,
    })
    .from(testimonials)
    .where(eq(testimonials.responseId, id))

  const testimonialByBlock = new Map<string, ExistingTestimonial>(
    existingTestimonials
      .filter((t): t is typeof t & { blockId: string } => Boolean(t.blockId))
      .map((t) => [
        t.blockId,
        {
          id: t.id,
          attendeeName: t.attendeeName,
          attendeeRole: t.attendeeRole,
          published: t.published,
        },
      ])
  )

  return (
    <AdminPageShell
      title={response.formTitle ?? 'Response'}
      description={`Submitted ${new Date(response.createdAt).toLocaleString()}`}
      contentClassName="max-w-3xl"
      actions={
        <>
          <Link
            href="/admin/responses"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ArrowLeft className="size-4" />
            Back to responses
          </Link>
          {response.formId ? (
            <Link
              href={`/admin/forms/${response.formId}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Edit form
            </Link>
          ) : null}
        </>
      }
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Answers
        </h2>
        {blocks.length === 0 && orphanAnswers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No answers were captured.</p>
        ) : (
          <dl className="space-y-3">
            {blocks.map((block) => {
              const raw = answers[block.id]
              const text = formatAnswer(raw)
              const isEmpty = text.trim() === ''
              const isShareable = block.type === 'short_text' || block.type === 'long_text'
              return (
                <div
                  key={block.id}
                  className="rounded-xl border border-border bg-card/50 px-4 py-3"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {block.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                    {isEmpty ? (
                      <span className="text-muted-foreground italic">No answer</span>
                    ) : (
                      text
                    )}
                  </dd>
                  {isShareable ? (
                    <AnswerTestimonialControls
                      responseId={response.id}
                      blockId={block.id}
                      initial={testimonialByBlock.get(block.id) ?? null}
                      isAnswerEmpty={isEmpty}
                    />
                  ) : null}
                </div>
              )
            })}
            {orphanAnswers.map(([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-3"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {key}{' '}
                  <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                    removed field
                  </span>
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                  {formatAnswer(value) || (
                    <span className="text-muted-foreground italic">No answer</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {response.submitterMeta ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Submitter info
          </h2>
          <pre className="overflow-x-auto rounded-xl border border-border bg-card/50 px-4 py-3 text-xs text-muted-foreground">
            {JSON.stringify(response.submitterMeta, null, 2)}
          </pre>
        </section>
      ) : null}
    </AdminPageShell>
  )
}
