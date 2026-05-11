'use server'

import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { requireApprovedAdmin } from '@/lib/auth/session'
import { db } from '@/db'
import { communityShowcase } from '@/db/schema'
import { isShowcaseProjectKind } from '@/lib/showcase/project-kind'
import {
  SHOWCASE_DESC_MAX,
  SHOWCASE_DESC_MAX_WORDS,
  SHOWCASE_DESC_MIN,
  SHOWCASE_DESC_MIN_WORDS,
  SHOWCASE_NAME_MAX,
  SHOWCASE_NAME_MIN,
  SHOWCASE_SCREENSHOT_MAX,
  SHOWCASE_SCREENSHOT_MIN,
  SHOWCASE_TITLE_MAX,
  SHOWCASE_TITLE_MIN,
  countWords,
  getBlockingValidationIssues,
  getShowcaseValidationSignals,
} from '@/lib/showcase/validation'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SubmitShowcaseResult =
  | { ok: true }
  | { ok: false; message: string }

export async function submitCommunityShowcase (input: {
  title: string
  description: string
  projectKind: string
  projectUrl: string
  repoUrl?: string
  builderName: string
  builderEmail: string
  screenshotUrls: string[]
}): Promise<SubmitShowcaseResult> {
  const title = input.title.trim()
  const description = input.description.trim()
  const projectKindRaw = input.projectKind?.trim() ?? ''
  const projectUrl = input.projectUrl.trim()
  const repoUrl = input.repoUrl?.trim() ?? ''
  const builderName = input.builderName.trim()
  const builderEmail = input.builderEmail.trim().toLowerCase()
  const screenshotUrls = input.screenshotUrls.map((u) => u.trim()).filter(Boolean)
  if (!projectKindRaw || !isShowcaseProjectKind(projectKindRaw)) {
    return { ok: false, message: 'Choose what type of project this is.' }
  }
  const signals = getShowcaseValidationSignals({
    title,
    description,
    projectUrl,
    repoUrl,
    builderName,
    screenshotUrls,
  })

  if (!signals.titleLengthOk) {
    return { ok: false, message: `Title must be ${SHOWCASE_TITLE_MIN}-${SHOWCASE_TITLE_MAX} characters.` }
  }
  if (!signals.descriptionLengthOk) {
    return { ok: false, message: `Description must be ${SHOWCASE_DESC_MIN}-${SHOWCASE_DESC_MAX} characters.` }
  }
  if (!signals.descriptionWordCountOk) {
    const words = countWords(description)
    if (words < SHOWCASE_DESC_MIN_WORDS) {
      return {
        ok: false,
        message: `Description must be at least ${SHOWCASE_DESC_MIN_WORDS} words (currently ${words}).`,
      }
    }
    return {
      ok: false,
      message: `Description must be at most ${SHOWCASE_DESC_MAX_WORDS} words (currently ${words}).`,
    }
  }
  if (!signals.projectUrlOk) {
    return { ok: false, message: 'Enter a valid http(s) project or demo URL.' }
  }
  if (!signals.repoUrlOk) {
    return { ok: false, message: 'Repository URL must be a valid http(s) link.' }
  }
  if (!signals.builderNameLengthOk) {
    return { ok: false, message: `Your name must be ${SHOWCASE_NAME_MIN}-${SHOWCASE_NAME_MAX} characters.` }
  }
  if (!builderEmail || !EMAIL_RE.test(builderEmail) || builderEmail.length > 254) {
    return { ok: false, message: 'Enter a valid email address.' }
  }
  if (!signals.screenshotCountOk) {
    return {
      ok: false,
      message: `Add ${SHOWCASE_SCREENSHOT_MIN}-${SHOWCASE_SCREENSHOT_MAX} valid https screenshots.`,
    }
  }
  if (signals.duplicateScreenshots) {
    return { ok: false, message: 'Screenshot URLs must be unique.' }
  }

  const validationIssues = getBlockingValidationIssues(signals)
  if (validationIssues.length > 0) {
    return { ok: false, message: validationIssues[0] }
  }

  try {
    await db.insert(communityShowcase).values({
      id: nanoid(),
      title,
      description,
      projectKind: projectKindRaw,
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
  await requireApprovedAdmin()
  const patch =
    status === 'approved'
      ? { status }
      : { status, featured: false as const }
  await db.update(communityShowcase).set(patch).where(eq(communityShowcase.id, id))
  revalidateShowcase()
}

export async function toggleShowcaseFeatured (id: string) {
  await requireApprovedAdmin()
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
  await requireApprovedAdmin()
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
  await requireApprovedAdmin()
  await db.delete(communityShowcase).where(eq(communityShowcase.id, id))
  revalidateShowcase()
}
