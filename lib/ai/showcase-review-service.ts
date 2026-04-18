import 'server-only'

import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { communityShowcase } from '@/db/schema'
import {
  reviewShowcaseSubmission,
} from '@/lib/ai/showcase-review'
import {
  handleShowcaseReviewRequest,
  type ShowcaseReviewDeps,
  type ShowcaseReviewResponse,
} from '@/lib/ai/showcase-review-handler'
import {
  requireSession,
} from '@/lib/auth/session'

export async function getShowcaseSubmissionById (id: string) {
  const rows = await db.select().from(communityShowcase).where(eq(communityShowcase.id, id)).limit(1)
  return rows[0] ?? null
}

export function createShowcaseReviewDeps (): ShowcaseReviewDeps {
  return {
    requireSession,
    getSubmissionById: getShowcaseSubmissionById,
    reviewSubmission: reviewShowcaseSubmission,
  }
}

export { handleShowcaseReviewRequest, type ShowcaseReviewResponse }
