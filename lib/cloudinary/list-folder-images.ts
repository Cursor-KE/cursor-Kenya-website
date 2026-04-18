import 'server-only'

import { v2 as cloudinary } from 'cloudinary'
import { getCloudinaryGalleryFolder } from '@/lib/cloudinary/folder'
import type { HomeGalleryPhoto } from '@/lib/gallery/types'

function configure () {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return false
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
  return true
}

/**
 * Lists images under the gallery sub-folder only (see `getCloudinaryGalleryFolder`).
 * Used as a fallback when the DB has no `images` rows yet but assets exist in Cloudinary.
 *
 * IMPORTANT: this MUST NOT include the showcase sub-folder, otherwise submitter
 * screenshots would leak into the public homepage gallery mosaic.
 */
export async function listCursorKenyaImages (
  maxResults: number
): Promise<HomeGalleryPhoto[]> {
  if (!configure()) return []

  const prefix = getCloudinaryGalleryFolder()

  type Resource = {
    public_id: string
    secure_url: string
    width?: number
    height?: number
    created_at?: string
  }

  try {
    const result = (await cloudinary.api.resources({
      resource_type: 'image',
      type: 'upload',
      prefix,
      max_results: maxResults,
    })) as { resources?: Resource[] }

    const raw = result.resources ?? []
    const sorted = [...raw].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })

    return sorted.map((r) => ({
      id: r.public_id,
      secureUrl: r.secure_url,
      alt: null,
      width: typeof r.width === 'number' ? r.width : null,
      height: typeof r.height === 'number' ? r.height : null,
    }))
  } catch {
    return []
  }
}
