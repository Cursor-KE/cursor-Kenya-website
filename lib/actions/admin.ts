'use server'

import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { forms, images, videos } from '@/db/schema'
import type { FormDefinition } from '@/lib/forms/types'
import { destroyCloudinaryImageByPublicId } from '@/lib/cloudinary/destroy-image'

const SESSION_DB_UNAVAILABLE = 'SESSION_DB_UNAVAILABLE'
const SESSION_UNAUTHORIZED = 'SESSION_UNAUTHORIZED'

function isDatabaseConnectivityError (err: unknown): boolean {
  const chunk = (e: unknown) => (e instanceof Error ? `${e.message} ${e.cause ?? ''}` : String(e))
  const full = chunk(err)
  if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENOTFOUND|Failed query|get session/i.test(full)) {
    return true
  }
  if (err instanceof AggregateError && Array.isArray(err.errors)) {
    return err.errors.some((e) => isDatabaseConnectivityError(e))
  }
  if (err instanceof Error && err.cause) {
    return isDatabaseConnectivityError(err.cause)
  }
  return false
}

function sleep (ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Loads the session; throws marked errors so callers can tell auth vs infra apart.
 * Better Auth hits Postgres — ETIMEDOUT is common when the DB is cold or the pool is busy.
 * One retry after a short delay often succeeds on Neon wake-up.
 */
async function requireSession () {
  const hdrs = await headers()
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      session = await auth.api.getSession({ headers: hdrs })
      break
    } catch (err) {
      if (!isDatabaseConnectivityError(err)) throw err
      if (attempt === 0) {
        await sleep(600)
        continue
      }
      const e = new Error(SESSION_DB_UNAVAILABLE)
      e.cause = err
      throw e
    }
  }
  if (!session?.user) {
    throw new Error(SESSION_UNAUTHORIZED)
  }
  return session
}

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
    await requireSession()
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
  await requireSession()
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
  await requireSession()
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
  await requireSession()
  await db.delete(videos).where(eq(videos.id, id))
  revalidatePath('/')
  revalidatePath('/gallery')
  revalidatePath('/admin/gallery')
}

/** Swap sort order with the neighbor above or below (list matches public gallery: highest sortOrder first). */
export async function swapVideoOrder (id: string, direction: 'up' | 'down') {
  await requireSession()
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
  await requireSession()
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
  await requireSession()
  await db.delete(forms).where(eq(forms.id, id))
  revalidatePath('/admin/forms')
}
