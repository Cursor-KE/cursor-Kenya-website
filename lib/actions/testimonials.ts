'use server'

import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { formResponses, forms, testimonials } from '@/db/schema'
import { formDefinitionSchema } from '@/lib/forms/types'
import { requireApprovedAdmin } from '@/lib/auth/session'

function revalidateTestimonialSurfaces () {
  revalidatePath('/')
  revalidatePath('/admin/testimonials')
  revalidatePath('/admin/responses')
}

export type ShareTestimonialInput = {
  responseId: string
  blockId: string
  attendeeName?: string
  attendeeRole?: string
}

export async function shareAnswerAsTestimonial (input: ShareTestimonialInput) {
  await requireApprovedAdmin()

  const rows = await db
    .select({
      id: formResponses.id,
      formId: formResponses.formId,
      answers: formResponses.answers,
      definition: forms.definition,
    })
    .from(formResponses)
    .leftJoin(forms, eq(formResponses.formId, forms.id))
    .where(eq(formResponses.id, input.responseId))
    .limit(1)

  const response = rows[0]
  if (!response) throw new Error('Response not found')

  const parsed = formDefinitionSchema.safeParse(response.definition)
  const block = parsed.success
    ? parsed.data.blocks.find((b) => b.id === input.blockId)
    : undefined

  const answers = (response.answers ?? {}) as Record<string, unknown>
  const raw = answers[input.blockId]
  const quote =
    typeof raw === 'string'
      ? raw.trim()
      : raw === undefined || raw === null
        ? ''
        : String(raw)

  if (!quote) {
    throw new Error('That answer is empty — nothing to share as a testimonial.')
  }

  const existing = await db
    .select({ id: testimonials.id })
    .from(testimonials)
    .where(
      and(
        eq(testimonials.responseId, input.responseId),
        eq(testimonials.blockId, input.blockId)
      )
    )
    .limit(1)

  if (existing[0]) {
    await db
      .update(testimonials)
      .set({
        quote,
        question: block?.label ?? null,
        attendeeName: input.attendeeName?.trim() || null,
        attendeeRole: input.attendeeRole?.trim() || null,
        published: true,
        updatedAt: new Date(),
      })
      .where(eq(testimonials.id, existing[0].id))
    revalidateTestimonialSurfaces()
    return { id: existing[0].id, created: false }
  }

  const id = nanoid()
  await db.insert(testimonials).values({
    id,
    formId: response.formId,
    responseId: input.responseId,
    blockId: input.blockId,
    question: block?.label ?? null,
    quote,
    attendeeName: input.attendeeName?.trim() || null,
    attendeeRole: input.attendeeRole?.trim() || null,
    published: true,
    sortOrder: Date.now() % 1_000_000,
  })
  revalidateTestimonialSurfaces()
  return { id, created: true }
}

export async function updateTestimonial (input: {
  id: string
  attendeeName?: string | null
  attendeeRole?: string | null
  quote?: string
  question?: string | null
}) {
  await requireApprovedAdmin()
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (input.attendeeName !== undefined) {
    patch.attendeeName = input.attendeeName?.trim() ? input.attendeeName.trim() : null
  }
  if (input.attendeeRole !== undefined) {
    patch.attendeeRole = input.attendeeRole?.trim() ? input.attendeeRole.trim() : null
  }
  if (input.question !== undefined) {
    patch.question = input.question?.trim() ? input.question.trim() : null
  }
  if (input.quote !== undefined) {
    const trimmed = input.quote.trim()
    if (!trimmed) throw new Error('Testimonial text cannot be empty.')
    patch.quote = trimmed
  }
  await db.update(testimonials).set(patch).where(eq(testimonials.id, input.id))
  revalidateTestimonialSurfaces()
}

export async function setTestimonialPublished (id: string, published: boolean) {
  await requireApprovedAdmin()
  await db
    .update(testimonials)
    .set({ published, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
  revalidateTestimonialSurfaces()
}

export async function setTestimonialFeatured (id: string, featured: boolean) {
  await requireApprovedAdmin()
  await db
    .update(testimonials)
    .set({ featured, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
  revalidateTestimonialSurfaces()
}

export async function deleteTestimonial (id: string) {
  await requireApprovedAdmin()
  await db.delete(testimonials).where(eq(testimonials.id, id))
  revalidateTestimonialSurfaces()
}

export async function getTestimonialsForResponse (responseId: string) {
  await requireApprovedAdmin()
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.responseId, responseId))
    .orderBy(desc(testimonials.createdAt))
}
