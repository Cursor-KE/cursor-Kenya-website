import { and, count, eq, gt, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { formResponses, forms } from '@/db/schema'
import { formDefinitionSchema } from '@/lib/forms/types'
import {
  FORM_SUBMISSION_RATE_LIMIT,
  FORM_SUBMISSION_RATE_WINDOW_MS,
  FormSubmissionInputError,
  hashFormSubmissionValue,
  normalizeFormAnswers,
  parseFormSubmissionBody,
  readFormSubmissionJson,
} from '@/lib/forms/submission'

function getClientIp (headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
}

export async function POST (req: Request) {
  try {
    const body = await readFormSubmissionJson(req)
    const parsedBody = parseFormSubmissionBody(body)
    if ('ok' in parsedBody) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status })
    }

    const rows = await db.select().from(forms).where(eq(forms.slug, parsedBody.slug)).limit(1)
    const form = rows[0]
    if (!form || form.status !== 'published') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const parsed = formDefinitionSchema.safeParse(form.definition)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid form definition' }, { status: 500 })
    }

    const normalized = normalizeFormAnswers(parsed.data, parsedBody.answers)
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: normalized.status })
    }

    const ipHash = hashFormSubmissionValue(`ip:${getClientIp(req.headers)}`)
    const rateWindowStart = new Date(Date.now() - FORM_SUBMISSION_RATE_WINDOW_MS)
    const [rate] = await db
      .select({ value: count() })
      .from(formResponses)
      .where(
        and(
          eq(formResponses.formId, form.id),
          gt(formResponses.createdAt, rateWindowStart),
          sql`${formResponses.submitterMeta}->>'ip_hash' = ${ipHash}`
        )
      )

    if ((rate?.value ?? 0) >= FORM_SUBMISSION_RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait before trying again.' },
        { status: 429 }
      )
    }

    await db.insert(formResponses).values({
      id: nanoid(),
      formId: form.id,
      answers: normalized.answers,
      submitterMeta: {
        ua: req.headers.get('user-agent') ?? undefined,
        ip_hash: ipHash,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof FormSubmissionInputError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
