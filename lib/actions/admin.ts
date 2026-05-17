'use server'

import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { forms, frameCardSettings, images, videos } from '@/db/schema'
import { formDefinitionSchema, type FormDefinition } from '@/lib/forms/types'
import { destroyCloudinaryImageByPublicId } from '@/lib/cloudinary/destroy-image'
import { normalizeFormSlug } from '@/lib/forms/slug'
import {
  requireApprovedAdmin,
  SESSION_DB_UNAVAILABLE,
  SESSION_UNAUTHORIZED,
  ADMIN_APPROVAL_REQUIRED,
} from '@/lib/auth/session'

const FRAME_CARD_SETTINGS_ID = 'default'
const MAX_FRAME_CARD_TITLE_LENGTH = 80

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

export async function saveFrameCardSettings (input: {
  title: string
  published: boolean
}) {
  await requireApprovedAdmin()

  const title = input.title.trim()
  if (!title) {
    throw new Error('Card title is required.')
  }
  if (title.length > MAX_FRAME_CARD_TITLE_LENGTH) {
    throw new Error(`Card title must be ${MAX_FRAME_CARD_TITLE_LENGTH} characters or fewer.`)
  }

  await db
    .insert(frameCardSettings)
    .values({
      id: FRAME_CARD_SETTINGS_ID,
      title,
      published: input.published,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: frameCardSettings.id,
      set: {
        title,
        published: input.published,
        updatedAt: new Date(),
      },
    })

  revalidatePath('/', 'layout')
  revalidatePath('/admin/frame')
  revalidatePath('/getyourcard')
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
  const title = input.title.trim()
  if (!title) {
    throw new Error('Title is required.')
  }

  const slug = normalizeFormSlug(input.slug)
  if (!slug) {
    throw new Error('Slug is required and must contain letters or numbers.')
  }

  const parsedDefinition = formDefinitionSchema.safeParse(input.definition)
  if (!parsedDefinition.success) {
    throw new Error('Form definition is invalid.')
  }

  const revalidateFormPaths = (id: string, nextSlug: string, previousSlug?: string | null) => {
    revalidatePath('/admin/forms')
    revalidatePath(`/admin/forms/${id}`)
    revalidatePath(`/forms/${nextSlug}`)
    if (previousSlug && previousSlug !== nextSlug) {
      revalidatePath(`/forms/${previousSlug}`)
    }
  }

  const isDuplicateSlugError = (error: unknown) => {
    const code = typeof (error as { code?: unknown } | null)?.code === 'string'
      ? (error as { code: string }).code
      : null
    const message = error instanceof Error ? error.message : String(error)
    return code === '23505' || /forms_slug_unique|duplicate key/i.test(message)
  }

  const definition = parsedDefinition.data

  if (input.id) {
    const currentRows = await db.select({ slug: forms.slug }).from(forms).where(eq(forms.id, input.id)).limit(1)
    try {
      await db
        .update(forms)
        .set({
          title,
          slug,
          status: input.status,
          definition,
          updatedAt: new Date(),
        })
        .where(eq(forms.id, input.id))
    } catch (error) {
      if (isDuplicateSlugError(error)) {
        throw new Error('A form with this slug already exists. Choose a different slug.')
      }
      throw error
    }
    revalidateFormPaths(input.id, slug, currentRows[0]?.slug ?? null)
    return { id: input.id, slug }
  }
  const id = nanoid()
  try {
    await db.insert(forms).values({
      id,
      title,
      slug,
      status: input.status,
      definition,
    })
  } catch (error) {
    if (isDuplicateSlugError(error)) {
      throw new Error('A form with this slug already exists. Choose a different slug.')
    }
    throw error
  }
  revalidateFormPaths(id, slug)
  return { id, slug }
}

export async function deleteForm (id: string) {
  await requireApprovedAdmin()
  await db.delete(forms).where(eq(forms.id, id))
  revalidatePath('/admin/forms')
}
