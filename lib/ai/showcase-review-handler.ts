import type { ShowcaseReviewResult } from '@/lib/ai/showcase-review-schema'
import {
  ShowcaseReviewConfigError,
  ShowcaseReviewOutputError,
  type ShowcaseReviewSubmission,
} from '@/lib/ai/showcase-review'

export const SESSION_DB_UNAVAILABLE = 'SESSION_DB_UNAVAILABLE'
export const SESSION_UNAUTHORIZED = 'SESSION_UNAUTHORIZED'

type ShowcaseReviewSuccess = {
  status: number
  body: { review: ShowcaseReviewResult }
}

type ShowcaseReviewFailure = {
  status: number
  body: { error: string }
}

export type ShowcaseReviewResponse = ShowcaseReviewSuccess | ShowcaseReviewFailure

export type ShowcaseReviewDeps = {
  requireSession: () => Promise<unknown>
  getSubmissionById: (id: string) => Promise<ShowcaseReviewSubmission | null>
  reviewSubmission: (submission: ShowcaseReviewSubmission) => Promise<ShowcaseReviewResult>
}

export async function handleShowcaseReviewRequest (
  body: unknown,
  deps: ShowcaseReviewDeps
): Promise<ShowcaseReviewResponse> {
  try {
    await deps.requireSession()
  } catch (error) {
    if (error instanceof Error && error.message === SESSION_UNAUTHORIZED) {
      return { status: 401, body: { error: 'You must be signed in to review showcase submissions.' } }
    }
    if (error instanceof Error && error.message === SESSION_DB_UNAVAILABLE) {
      return { status: 503, body: { error: 'Could not verify your session because the database is unavailable.' } }
    }
    throw error
  }

  const showcaseId = typeof (body as { showcaseId?: unknown } | null)?.showcaseId === 'string'
    ? (body as { showcaseId: string }).showcaseId.trim()
    : ''
  if (!showcaseId) {
    return { status: 400, body: { error: 'Missing showcaseId.' } }
  }

  const submission = await deps.getSubmissionById(showcaseId)
  if (!submission) {
    return { status: 404, body: { error: 'Showcase submission not found.' } }
  }

  try {
    const review = await deps.reviewSubmission(submission)
    return { status: 200, body: { review } }
  } catch (error) {
    if (error instanceof ShowcaseReviewConfigError) {
      return { status: 503, body: { error: error.message } }
    }
    if (error instanceof ShowcaseReviewOutputError) {
      return { status: 502, body: { error: error.message } }
    }
    throw error
  }
}
