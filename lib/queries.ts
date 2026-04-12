import 'server-only'

import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { images, videos } from '@/db/schema'
import { listCursorKenyaImages } from '@/lib/cloudinary/list-folder-images'
import type { HomeGalleryPhoto } from '@/lib/gallery/types'

export type { HomeGalleryPhoto } from '@/lib/gallery/types'

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
