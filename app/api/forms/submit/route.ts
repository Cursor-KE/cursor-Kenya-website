import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { formResponses, forms } from '@/db/schema'
import { formDefinitionSchema } from '@/lib/forms/types'

export async function POST (req: Request) {
  try {
    const body = await req.json()
    const slug = typeof body.slug === 'string' ? body.slug : ''
    const answers =
      body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {}

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    const rows = await db.select().from(forms).where(eq(forms.slug, slug)).limit(1)
    const form = rows[0]
    if (!form || form.status !== 'published') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const parsed = formDefinitionSchema.safeParse(form.definition)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid form definition' }, { status: 500 })
    }

    for (const block of parsed.data.blocks) {
      if (!block.required) continue
      const v = answers[block.id]
      if (v === undefined || v === null || String(v).trim() === '') {
        return NextResponse.json(
          { error: `Required: ${block.label}` },
          { status: 400 }
        )
      }
    }

    await db.insert(formResponses).values({
      id: nanoid(),
      formId: form.id,
      answers: answers as Record<string, unknown>,
      submitterMeta: { ua: req.headers.get('user-agent') ?? undefined },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
