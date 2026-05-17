import 'server-only'

import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { communityShowcase, frameCardSettings, images, showcaseAiActions, showcaseAiReviews, testimonials, videos } from '@/db/schema'
import type { ShowcaseSavedReview } from '@/lib/ai/showcase-review-schema'
import { listCursorKenyaImages } from '@/lib/cloudinary/list-folder-images'
import {
  DEFAULT_FRAME_CARD_TITLE,
  type FrameCardSettings,
} from '@/lib/frame-card/settings'
import type { HomeGalleryPhoto } from '@/lib/gallery/types'

export type { HomeGalleryPhoto } from '@/lib/gallery/types'

export async function getFrameCardSettings (): Promise<FrameCardSettings> {
  try {
    const rows = await db
      .select({
        title: frameCardSettings.title,
        published: frameCardSettings.published,
      })
      .from(frameCardSettings)
      .where(eq(frameCardSettings.id, 'default'))
      .limit(1)

    return rows[0] ?? {
      title: DEFAULT_FRAME_CARD_TITLE,
      published: false,
    }
  } catch {
    return {
      title: DEFAULT_FRAME_CARD_TITLE,
      published: false,
    }
  }
}

export async function getPublishedFrameCardSettings (): Promise<FrameCardSettings | null> {
  const settings = await getFrameCardSettings()
  return settings.published ? settings : null
}

export async function getFeaturedVideos () {
  return db
    .select()
    .from(videos)
    .where(eq(videos.featured, true))
    .orderBy(desc(videos.sortOrder))
    .limit(8)
}

export async function getAllImages () {
  return db.select().from(images).orderBy(desc(images.sortOrder))
}

export async function getAllVideos () {
  return db.select().from(videos).orderBy(desc(videos.sortOrder))
}

/** Approved projects for the public showcase page (featured and sort order first). */
export async function getApprovedCommunityShowcase () {
  return db
    .select()
    .from(communityShowcase)
    .where(eq(communityShowcase.status, 'approved'))
    .orderBy(desc(communityShowcase.featured), desc(communityShowcase.sortOrder), desc(communityShowcase.createdAt))
}

/** Homepage teaser: approved + featured only. */
export async function getFeaturedCommunityShowcase (limit = 6) {
  return db
    .select()
    .from(communityShowcase)
    .where(and(eq(communityShowcase.status, 'approved'), eq(communityShowcase.featured, true)))
    .orderBy(desc(communityShowcase.sortOrder), desc(communityShowcase.createdAt))
    .limit(limit)
}

export async function getAllCommunityShowcaseForAdmin () {
  return db
    .select()
    .from(communityShowcase)
    .orderBy(desc(communityShowcase.sortOrder), desc(communityShowcase.createdAt))
}

export async function getLatestShowcaseAiReviewsForAdmin (): Promise<Record<string, ShowcaseSavedReview>> {
  const reviewRows = await db
    .selectDistinctOn([showcaseAiReviews.showcaseId])
    .from(showcaseAiReviews)
    .orderBy(showcaseAiReviews.showcaseId, desc(showcaseAiReviews.createdAt))

  if (reviewRows.length === 0) {
    return {}
  }

  const reviewIds = reviewRows.map((row) => row.id)
  const actionRows = await db
    .selectDistinctOn([showcaseAiActions.reviewId])
    .from(showcaseAiActions)
    .where(inArray(showcaseAiActions.reviewId, reviewIds))
    .orderBy(showcaseAiActions.reviewId, desc(showcaseAiActions.executedAt))

  const latestActionByReview = new Map<string, typeof showcaseAiActions.$inferSelect>(
    actionRows.map((row) => [row.reviewId, row])
  )

  return Object.fromEntries(
    reviewRows.map((row) => {
      const action = latestActionByReview.get(row.id) ?? null
      return [
        row.showcaseId,
        {
          showcaseId: row.showcaseId,
          reviewId: row.id,
          model: row.model,
          createdAt: row.createdAt.toISOString(),
          statusAtReview: row.statusAtReview,
          validationSignals: row.validationSignals,
          policyOutcome: row.policyOutcome,
          review: row.reviewJson,
          autoAction: action
            ? {
                id: action.id,
                action: action.action,
                success: action.success,
                executedAt: action.executedAt.toISOString(),
                failureReason: action.failureReason,
                preActionStatus: action.preActionStatus,
                postActionStatus: action.postActionStatus,
              }
            : null,
        } satisfies ShowcaseSavedReview,
      ]
    })
  )
}

export async function getPublishedTestimonials (limit = 12) {
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(desc(testimonials.featured), desc(testimonials.sortOrder), desc(testimonials.createdAt))
    .limit(limit)
}

export async function getAllTestimonialsForAdmin () {
  return db
    .select()
    .from(testimonials)
    .orderBy(desc(testimonials.featured), desc(testimonials.sortOrder), desc(testimonials.createdAt))
}

/** Curated gallery rows first; otherwise images listed from the Cloudinary folder (`CLOUDINARY_UPLOAD_PREFIX` or `cursor-kenya`). */
export async function getHomeFeaturedImages (limit = 9): Promise<HomeGalleryPhoto[]> {
  try {
    const rows = await db
      .select()
      .from(images)
      .orderBy(desc(images.sortOrder))
      .limit(limit)
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        secureUrl: r.secureUrl,
        alt: r.alt ?? null,
        width: r.width,
        height: r.height,
      }))
    }
  } catch {
    // DB unavailable
  }
  return listCursorKenyaImages(limit)
}
