import 'server-only'

import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  communityShowcase,
  showcaseAiActions,
  showcaseAiReviews,
  type ShowcaseReviewPolicyOutcome,
} from '@/db/schema'
import {
  SHOWCASE_REVIEW_PROMPT_VERSION,
  getShowcaseReviewModel,
  reviewShowcaseSubmission,
  type ShowcaseReviewSubmission,
} from '@/lib/ai/showcase-review'
import {
  handleShowcaseBatchReviewRequest,
  handleShowcaseReviewRequest,
  type ShowcaseBatchReviewResponse,
  type ShowcaseReviewDeps,
  type ShowcaseReviewResponse,
} from '@/lib/ai/showcase-review-handler'
import { evaluateShowcasePolicy } from '@/lib/ai/showcase-policy'
import type { ShowcaseSavedReview } from '@/lib/ai/showcase-review-schema'
import { requireSession } from '@/lib/auth/session'
import { getShowcaseValidationSignals, type ShowcaseValidationSignals } from '@/lib/showcase/validation'

export async function getShowcaseSubmissionById (id: string) {
  const rows = await db.select().from(communityShowcase).where(eq(communityShowcase.id, id)).limit(1)
  return rows[0] ?? null
}

async function getPendingShowcaseSubmissions (limit: number) {
  return db
    .select()
    .from(communityShowcase)
    .where(eq(communityShowcase.status, 'pending'))
    .orderBy(desc(communityShowcase.createdAt))
    .limit(limit)
}

function toValidationSignals (submission: ShowcaseReviewSubmission): ShowcaseValidationSignals {
  return getShowcaseValidationSignals({
    title: submission.title,
    description: submission.description,
    projectUrl: submission.projectUrl,
    repoUrl: submission.repoUrl,
    builderName: submission.builderName,
    screenshotUrls: submission.screenshotUrls,
  })
}

function toSavedReview (
  reviewRow: typeof showcaseAiReviews.$inferSelect,
  autoAction: typeof showcaseAiActions.$inferSelect | null
): ShowcaseSavedReview {
  return {
    showcaseId: reviewRow.showcaseId,
    reviewId: reviewRow.id,
    model: reviewRow.model,
    createdAt: reviewRow.createdAt.toISOString(),
    statusAtReview: reviewRow.statusAtReview,
    validationSignals: reviewRow.validationSignals,
    policyOutcome: reviewRow.policyOutcome,
    review: reviewRow.reviewJson,
    autoAction: autoAction
      ? {
          id: autoAction.id,
          action: autoAction.action,
          success: autoAction.success,
          executedAt: autoAction.executedAt.toISOString(),
          failureReason: autoAction.failureReason,
          preActionStatus: autoAction.preActionStatus,
          postActionStatus: autoAction.postActionStatus,
        }
      : null,
  }
}

function revalidateShowcaseAdminViews () {
  revalidatePath('/')
  revalidatePath('/community-showcase')
  revalidatePath('/admin/community-showcase')
}

async function saveReviewRecord (input: {
  submission: ShowcaseReviewSubmission
  validationSignals: ShowcaseValidationSignals
  review: Awaited<ReturnType<typeof reviewShowcaseSubmission>>
  policyOutcome: ShowcaseReviewPolicyOutcome
  userId: string | null
}) {
  const id = nanoid()
  await db.insert(showcaseAiReviews).values({
    id,
    showcaseId: input.submission.id,
    statusAtReview: input.submission.status,
    promptVersion: SHOWCASE_REVIEW_PROMPT_VERSION,
    model: getShowcaseReviewModel(),
    validationSignals: input.validationSignals,
    reviewJson: input.review,
    policyOutcome: input.policyOutcome,
    createdByUserId: input.userId,
  })
  const rows = await db.select().from(showcaseAiReviews).where(eq(showcaseAiReviews.id, id)).limit(1)
  return rows[0]
}

async function saveActionRecord (input: {
  showcaseId: string
  reviewId: string
  policyOutcome: ShowcaseReviewPolicyOutcome
  preActionStatus: 'pending' | 'approved' | 'rejected'
  success: boolean
  failureReason: string | null
  postActionStatus: 'pending' | 'approved' | 'rejected' | null
}) {
  const id = nanoid()
  await db.insert(showcaseAiActions).values({
    id,
    showcaseId: input.showcaseId,
    reviewId: input.reviewId,
    action: 'approve',
    actionSource: 'ai_auto_action',
    policySnapshot: input.policyOutcome,
    executedByUserId: null,
    success: input.success,
    failureReason: input.failureReason,
    preActionStatus: input.preActionStatus,
    postActionStatus: input.postActionStatus,
  })
  const rows = await db.select().from(showcaseAiActions).where(eq(showcaseAiActions.id, id)).limit(1)
  return rows[0]
}

async function applyAutoApproveIfAllowed (input: {
  submission: ShowcaseReviewSubmission
  reviewId: string
  policyOutcome: ShowcaseReviewPolicyOutcome
  autoApply: boolean
}) {
  if (!input.autoApply || input.policyOutcome.decisionMode !== 'auto_approved') {
    return null
  }

  const currentRows = await db
    .select()
    .from(communityShowcase)
    .where(eq(communityShowcase.id, input.submission.id))
    .limit(1)
  const current = currentRows[0]

  if (!current || current.status !== 'pending') {
    return saveActionRecord({
      showcaseId: input.submission.id,
      reviewId: input.reviewId,
      policyOutcome: input.policyOutcome,
      preActionStatus: input.submission.status,
      success: false,
      failureReason: 'Submission status changed before auto-approval could run.',
      postActionStatus: current?.status ?? null,
    })
  }

  await db
    .update(communityShowcase)
    .set({ status: 'approved' })
    .where(and(eq(communityShowcase.id, current.id), eq(communityShowcase.status, 'pending')))

  revalidateShowcaseAdminViews()

  return saveActionRecord({
    showcaseId: input.submission.id,
    reviewId: input.reviewId,
    policyOutcome: input.policyOutcome,
    preActionStatus: input.submission.status,
    success: true,
    failureReason: null,
    postActionStatus: 'approved',
  })
}

export async function runSingleShowcaseReview (input: {
  showcaseId: string
  userId: string | null
  autoApply?: boolean
}): Promise<ShowcaseSavedReview | null> {
  const submission = await getShowcaseSubmissionById(input.showcaseId)
  if (!submission) return null

  const validationSignals = toValidationSignals(submission)
  const review = await reviewShowcaseSubmission(submission, validationSignals)
  const policyOutcome = evaluateShowcasePolicy({
    status: submission.status,
    validationSignals,
    review,
  })

  const reviewRow = await saveReviewRecord({
    submission,
    validationSignals,
    review,
    policyOutcome,
    userId: input.userId,
  })

  const actionRow = await applyAutoApproveIfAllowed({
    submission,
    reviewId: reviewRow.id,
    policyOutcome,
    autoApply: Boolean(input.autoApply),
  })

  return toSavedReview(reviewRow, actionRow)
}

export async function runBatchShowcaseReview (input: {
  limit: number
  userId: string | null
}): Promise<ShowcaseSavedReview[]> {
  const rows = await getPendingShowcaseSubmissions(input.limit)
  const results: ShowcaseSavedReview[] = []
  for (const row of rows) {
    const result = await runSingleShowcaseReview({
      showcaseId: row.id,
      userId: input.userId,
      autoApply: true,
    })
    if (result) results.push(result)
  }
  return results
}

export function createShowcaseReviewDeps (): ShowcaseReviewDeps {
  return {
    requireSession,
    runSingleReview: runSingleShowcaseReview,
    runBatchReview: runBatchShowcaseReview,
  }
}

export {
  handleShowcaseBatchReviewRequest,
  handleShowcaseReviewRequest,
  type ShowcaseBatchReviewResponse,
  type ShowcaseReviewResponse,
}
