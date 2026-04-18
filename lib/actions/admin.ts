'use server'

import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { forms, images, videos } from '@/db/schema'
import type { FormDefinition } from '@/lib/forms/types'
import { destroyCloudinaryImageByPublicId } from '@/lib/cloudinary/destroy-image'
import {
  requireApprovedAdmin,
  SESSION_DB_UNAVAILABLE,
  SESSION_UNAUTHORIZED,
  ADMIN_APPROVAL_REQUIRED,
} from '@/lib/auth/session'

export type SaveImageRecordResult =
  | { ok: true; id: string }
  | { ok: false; message: string }

export async function saveImageRecord (input: {
  publicId: string
  secureUrl: string
  alt?: string
  width?: number
  height?: number
}): Promise<SaveImageRecordResult> {
  try {
    await requireApprovedAdmin()
  } catch (e) {
    if (e instanceof Error && e.message === SESSION_DB_UNAVAILABLE) {
      return {
        ok: false,
        message:
          'Could not verify your session — the database did not respond in time. Wait a few seconds and try again. If this keeps happening, check DATABASE_URL and use your host’s pooled connection string (e.g. Neon port 6543) and DATABASE_PREPARED_STATEMENTS=false when using a pooler.',
      }
    }
    if (e instanceof Error && e.message === SESSION_UNAUTHORIZED) {
      return {
        ok: false,
        message:
          'Not signed in. Open /admin/login in this browser, sign in, then upload again.',
      }
    }
    if (e instanceof Error && e.message === ADMIN_APPROVAL_REQUIRED) {
      return {
        ok: false,
        message:
          'Your admin account is still waiting for approval from the super user.',
      }
    }
    throw e
  }

  const id = nanoid()
  try {
    await db.insert(images).values({
      id,
      publicId: input.publicId,
      secureUrl: input.secureUrl,
      alt: input.alt ?? '',
      width: input.width ?? null,
      height: input.height ?? null,
      sortOrder: Date.now() % 1_000_000,
    })
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error('[saveImageRecord]', detail)
    return {
      ok: false,
      message: `Could not save to the database. Check DATABASE_URL points at the correct Postgres instance. ${detail}`,
    }
  }

  revalidatePath('/')
  revalidatePath('/gallery')
  revalidatePath('/admin/gallery')
  return { ok: true, id }
}

export async function deleteImage (id: string) {
  await requireApprovedAdmin()
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1)
  const row = rows[0]
  if (!row) return

  const cloud = await destroyCloudinaryImageByPublicId(row.publicId)
  if (!cloud.ok) {
    throw new Error(cloud.reason)
  }

  await db.delete(images).where(eq(images.id, id))
  revalidatePath('/')
  revalidatePath('/gallery')
  revalidatePath('/admin/gallery')
}

export async function saveVideo (input: {
  youtubeVideoId: string
  title?: string
  description?: string
  featured?: boolean
}) {
  await requireApprovedAdmin()
  await db.insert(videos).values({
    id: nanoid(),
    youtubeVideoId: input.youtubeVideoId,
    title: input.title ?? null,
    description: input.description ?? null,
    featured: input.featured ?? false,
    sortOrder: Date.now() % 1_000_000,
  })
  revalidatePath('/')
  revalidatePath('/gallery')
  revalidatePath('/admin/gallery')
}

export async function deleteVideo (id: string) {
  await requireApprovedAdmin()
  await db.delete(videos).where(eq(videos.id, id))
  revalidatePath('/')
  revalidatePath('/gallery')
  revalidatePath('/admin/gallery')
}

/** Swap sort order with the neighbor above or below (list matches public gallery: highest sortOrder first). */
export async function swapVideoOrder (id: string, direction: 'up' | 'down') {
  await requireApprovedAdmin()
  const all = await db.select().from(videos).orderBy(desc(videos.sortOrder))
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return
  const a = all[idx]
  const b = all[swapIdx]
  const orderA = a.sortOrder
  const orderB = b.sortOrder
  await db.update(videos).set({ sortOrder: orderB }).where(eq(videos.id, a.id))
  await db.update(videos).set({ sortOrder: orderA }).where(eq(videos.id, b.id))
  revalidatePath('/')
  revalidatePath('/gallery')
  revalidatePath('/admin/gallery')
}

export async function saveForm (input: {
  id?: string
  title: string
  slug: string
  status: 'draft' | 'published'
  definition: FormDefinition
}) {
  await requireApprovedAdmin()
  if (input.id) {
    await db
      .update(forms)
      .set({
        title: input.title,
        slug: input.slug,
        status: input.status,
        definition: input.definition,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, input.id))
    revalidatePath('/admin/forms')
    return { id: input.id }
  }
  const id = nanoid()
  await db.insert(forms).values({
    id,
    title: input.title,
    slug: input.slug,
    status: input.status,
    definition: input.definition,
  })
  revalidatePath('/admin/forms')
  return { id }
}

export async function deleteForm (id: string) {
  await requireApprovedAdmin()
  await db.delete(forms).where(eq(forms.id, id))
  revalidatePath('/admin/forms')
}
