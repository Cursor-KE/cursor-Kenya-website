'use server'

import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { recapPosts } from '@/db/schema'
import { requireApprovedAdmin } from '@/lib/auth/session'
import { recapInputSchema } from '@/lib/recaps/validation'

export type RecapActionState = {
  ok: boolean
  message: string
  id?: string
}

function value (formData: FormData, key: string) {
  return String(formData.get(key) ?? '')
}

function actionError (error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues?: Array<{ message?: string }> }).issues
    return issues?.[0]?.message ?? 'Check the recap fields.'
  }
  const detail = error instanceof Error ? `${error.message} ${error.cause ?? ''}` : String(error)
  if (/unique|duplicate/i.test(detail)) return 'That recap URL is already in use.'
  return error instanceof Error ? error.message : 'The recap could not be saved.'
}

function revalidateRecaps (slug?: string) {
  revalidatePath('/admin/recaps')
  revalidatePath('/recaps')
  if (slug) revalidatePath(`/recaps/${slug}`)
}

export async function saveRecapPost (_state: RecapActionState, formData: FormData): Promise<RecapActionState> {
  try {
    const { user } = await requireApprovedAdmin()
    const parsed = recapInputSchema.parse({
      title: value(formData, 'title'),
      slug: value(formData, 'slug'),
      excerpt: value(formData, 'excerpt'),
      content: value(formData, 'content'),
      coverImageUrl: value(formData, 'coverImageUrl'),
      status: value(formData, 'status'),
    })
    const id = value(formData, 'id') || nanoid()
    const existing = value(formData, 'id')
      ? (await db.select({ slug: recapPosts.slug, publishedAt: recapPosts.publishedAt })
          .from(recapPosts).where(eq(recapPosts.id, id)).limit(1))[0]
      : null
    if (value(formData, 'id') && !existing) return { ok: false, message: 'Recap post not found.' }

    const publishedAt = parsed.status === 'published'
      ? existing?.publishedAt ?? new Date()
      : null

    if (existing) {
      await db.update(recapPosts).set({
        ...parsed,
        updatedByUserId: user.id,
        publishedAt,
        updatedAt: new Date(),
      }).where(eq(recapPosts.id, id))
      if (existing.slug !== parsed.slug) revalidatePath(`/recaps/${existing.slug}`)
    } else {
      await db.insert(recapPosts).values({
        id,
        ...parsed,
        authorUserId: user.id,
        updatedByUserId: user.id,
        publishedAt,
      })
    }

    revalidateRecaps(parsed.slug)
    return {
      ok: true,
      id,
      message: parsed.status === 'published' ? 'Recap published and visible to everyone.' : 'Draft saved privately.',
    }
  } catch (error) {
    return { ok: false, message: actionError(error) }
  }
}

export async function setRecapPublication (formData: FormData) {
  const { user } = await requireApprovedAdmin()
  const id = value(formData, 'id')
  const status = value(formData, 'status') === 'published' ? 'published' : 'draft'
  const [post] = await db.select({ slug: recapPosts.slug, publishedAt: recapPosts.publishedAt })
    .from(recapPosts).where(eq(recapPosts.id, id)).limit(1)
  if (!post) throw new Error('Recap post not found.')
  await db.update(recapPosts).set({
    status,
    publishedAt: status === 'published' ? post.publishedAt ?? new Date() : null,
    updatedByUserId: user.id,
    updatedAt: new Date(),
  }).where(eq(recapPosts.id, id))
  revalidateRecaps(post.slug)
}
