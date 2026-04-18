import type { ShowcaseSavedReview } from '@/lib/ai/showcase-review-schema'
import { ShowcaseReviewConfigError, ShowcaseReviewOutputError } from '@/lib/ai/showcase-review'

export const SESSION_DB_UNAVAILABLE = 'SESSION_DB_UNAVAILABLE'
export const SESSION_UNAUTHORIZED = 'SESSION_UNAUTHORIZED'
export const ADMIN_APPROVAL_REQUIRED = 'ADMIN_APPROVAL_REQUIRED'
export const ADMIN_FORBIDDEN = 'ADMIN_FORBIDDEN'

type ShowcaseReviewSuccess = {
  status: number
  body: { result: ShowcaseSavedReview }
}

type ShowcaseBatchReviewSuccess = {
  status: number
  body: {
    results: ShowcaseSavedReview[]
    summary: {
      autoApproved: number
      manualReview: number
    }
  }
}

type ShowcaseReviewFailure = {
  status: number
  body: { error: string }
}

export type ShowcaseReviewResponse = ShowcaseReviewSuccess | ShowcaseReviewFailure
export type ShowcaseBatchReviewResponse = ShowcaseBatchReviewSuccess | ShowcaseReviewFailure

export type ShowcaseReviewDeps = {
  requireSession: () => Promise<unknown>
  runSingleReview: (input: {
    showcaseId: string
    userId: string | null
    autoApply?: boolean
  }) => Promise<ShowcaseSavedReview | null>
  runBatchReview: (input: {
    limit: number
    userId: string | null
  }) => Promise<ShowcaseSavedReview[]>
}

function getUserId (session: unknown) {
  return typeof (session as { user?: { id?: unknown } } | null)?.user?.id === 'string'
    ? (session as { user: { id: string } }).user.id
    : null
}

function handleSharedError (error: unknown): ShowcaseReviewFailure | null {
  if (error instanceof Error && error.message === SESSION_UNAUTHORIZED) {
    return { status: 401, body: { error: 'You must be signed in to review showcase submissions.' } }
  }
  if (error instanceof Error && error.message === SESSION_DB_UNAVAILABLE) {
    return { status: 503, body: { error: 'Could not verify your session because the database is unavailable.' } }
  }
  if (error instanceof Error && error.message === ADMIN_APPROVAL_REQUIRED) {
    return { status: 403, body: { error: 'Your admin account is still waiting for super-user approval.' } }
  }
  if (error instanceof Error && error.message === ADMIN_FORBIDDEN) {
    return { status: 403, body: { error: 'You do not have permission to review showcase submissions.' } }
  }
  if (error instanceof ShowcaseReviewConfigError) {
    return { status: 503, body: { error: error.message } }
  }
  if (error instanceof ShowcaseReviewOutputError) {
    return { status: 502, body: { error: error.message } }
  }
  return null
}

export async function handleShowcaseReviewRequest (
  body: unknown,
  deps: ShowcaseReviewDeps
): Promise<ShowcaseReviewResponse> {
  try {
    const session = await deps.requireSession()
    const showcaseId = typeof (body as { showcaseId?: unknown } | null)?.showcaseId === 'string'
      ? (body as { showcaseId: string }).showcaseId.trim()
      : ''
    const autoApply = Boolean((body as { autoApply?: unknown } | null)?.autoApply)

    if (!showcaseId) {
      return { status: 400, body: { error: 'Missing showcaseId.' } }
    }

    const result = await deps.runSingleReview({
      showcaseId,
      userId: getUserId(session),
      autoApply,
    })
    if (!result) {
      return { status: 404, body: { error: 'Showcase submission not found.' } }
    }
    return { status: 200, body: { result } }
  } catch (error) {
    const handled = handleSharedError(error)
    if (handled) return handled
    throw error
  }
}

export async function handleShowcaseBatchReviewRequest (
  body: unknown,
  deps: ShowcaseReviewDeps
): Promise<ShowcaseBatchReviewResponse> {
  try {
    const session = await deps.requireSession()
    const rawLimit = typeof (body as { limit?: unknown } | null)?.limit === 'number'
      ? (body as { limit: number }).limit
      : 10
    const results = await deps.runBatchReview({
      limit: Math.max(1, Math.min(20, Math.floor(rawLimit))),
      userId: getUserId(session),
    })
    return {
      status: 200,
      body: {
        results,
        summary: {
          autoApproved: results.filter((result) => result.policyOutcome.decisionMode === 'auto_approved').length,
          manualReview: results.filter((result) => result.policyOutcome.decisionMode === 'manual_review').length,
        },
      },
    }
  } catch (error) {
    const handled = handleSharedError(error)
    if (handled) return handled
    throw error
  }
}
