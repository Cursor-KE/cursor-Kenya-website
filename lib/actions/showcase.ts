'use server'

import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/actions/admin'
import { db } from '@/db'
import { communityShowcase } from '@/db/schema'

const MAX_TITLE = 200
const MAX_DESC = 8000
const MAX_URL = 2048

function isHttpsUrl (raw: string) {
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function isScreenshotUrl (raw: string) {
  if (!isHttpsUrl(raw)) return false
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SubmitShowcaseResult =
  | { ok: true }
  | { ok: false; message: string }

export async function submitCommunityShowcase (input: {
  title: string
  description: string
  projectUrl: string
  repoUrl?: string
  builderName: string
  builderEmail: string
  screenshotUrls: string[]
}): Promise<SubmitShowcaseResult> {
  const title = input.title.trim()
  const description = input.description.trim()
  const projectUrl = input.projectUrl.trim()
  const repoUrl = input.repoUrl?.trim() ?? ''
  const builderName = input.builderName.trim()
  const builderEmail = input.builderEmail.trim().toLowerCase()
  const screenshotUrls = input.screenshotUrls.map((u) => u.trim()).filter(Boolean)

  if (!title || title.length > MAX_TITLE) {
    return { ok: false, message: 'Title is required (max 200 characters).' }
  }
  if (!description || description.length > MAX_DESC) {
    return { ok: false, message: 'Description is required.' }
  }
  if (!projectUrl || !isHttpsUrl(projectUrl) || projectUrl.length > MAX_URL) {
    return { ok: false, message: 'Enter a valid http(s) project or demo URL.' }
  }
  if (repoUrl && (!isHttpsUrl(repoUrl) || repoUrl.length > MAX_URL)) {
    return { ok: false, message: 'Repository URL must be a valid http(s) link.' }
  }
  if (!builderName || builderName.length > 120) {
    return { ok: false, message: 'Your name is required.' }
  }
  if (!builderEmail || !EMAIL_RE.test(builderEmail) || builderEmail.length > 254) {
    return { ok: false, message: 'Enter a valid email address.' }
  }
  if (screenshotUrls.length < 2) {
    return { ok: false, message: 'Add at least two product screenshots.' }
  }
  if (screenshotUrls.length > 8) {
    return { ok: false, message: 'Maximum eight screenshots.' }
  }
  for (const u of screenshotUrls) {
    if (!isScreenshotUrl(u) || u.length > MAX_URL) {
      return { ok: false, message: 'Each screenshot must be a valid https URL.' }
    }
  }

  try {
    await db.insert(communityShowcase).values({
      id: nanoid(),
      title,
      description,
      projectUrl,
      repoUrl: repoUrl || null,
      builderName,
      builderEmail,
      screenshotUrls,
      status: 'pending',
      featured: false,
      sortOrder: Date.now() % 1_000_000,
    })
  } catch (e) {
    console.error('[submitCommunityShowcase]', e)
    return {
      ok: false,
      message: 'Could not save your submission. Try again later.',
    }
  }

  revalidatePath('/community-showcase')
  revalidatePath('/admin/community-showcase')
  return { ok: true }
}

function revalidateShowcase () {
  revalidatePath('/')
  revalidatePath('/community-showcase')
  revalidatePath('/admin/community-showcase')
}

export async function updateShowcaseStatus (
  id: string,
  status: 'pending' | 'approved' | 'rejected'
) {
  await requireSession()
  const patch =
    status === 'approved'
      ? { status }
      : { status, featured: false as const }
  await db.update(communityShowcase).set(patch).where(eq(communityShowcase.id, id))
  revalidateShowcase()
}

export async function toggleShowcaseFeatured (id: string) {
  await requireSession()
  const rows = await db.select().from(communityShowcase).where(eq(communityShowcase.id, id)).limit(1)
  const row = rows[0]
  if (!row || row.status !== 'approved') return
  await db
    .update(communityShowcase)
    .set({ featured: !row.featured })
    .where(eq(communityShowcase.id, id))
  revalidateShowcase()
}

export async function swapShowcaseOrder (id: string, direction: 'up' | 'down') {
  await requireSession()
  const all = await db.select().from(communityShowcase).orderBy(desc(communityShowcase.sortOrder))
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return
  const a = all[idx]
  const b = all[swapIdx]
  const orderA = a.sortOrder
  const orderB = b.sortOrder
  await db.update(communityShowcase).set({ sortOrder: orderB }).where(eq(communityShowcase.id, a.id))
  await db.update(communityShowcase).set({ sortOrder: orderA }).where(eq(communityShowcase.id, b.id))
  revalidateShowcase()
}

export async function deleteShowcase (id: string) {
  await requireSession()
  await db.delete(communityShowcase).where(eq(communityShowcase.id, id))
  revalidateShowcase()
}
