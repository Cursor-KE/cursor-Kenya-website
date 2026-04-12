import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

function configure (): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return false
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
  return true
}

type DestroyResult = { ok: true } | { ok: false; reason: string }

/**
 * Removes an image from Cloudinary by `public_id` (same value stored in DB `images.public_id`).
 * Treats “not found” as success so DB can stay in sync if the asset was removed manually.
 */
export async function destroyCloudinaryImageByPublicId (publicId: string): Promise<DestroyResult> {
  if (!configure()) {
    return { ok: false, reason: 'Cloudinary is not configured (set CLOUDINARY_* env vars).' }
  }
  try {
    const res = (await cloudinary.uploader.destroy(publicId)) as {
      result?: string
      error?: { message?: string }
    }
    if (res.error) {
      return { ok: false, reason: res.error.message ?? 'Cloudinary destroy failed' }
    }
    const r = (res.result ?? '').toLowerCase().replace(/\s+/g, '_')
    if (r && r !== 'ok' && r !== 'not_found') {
      console.warn('[destroyCloudinaryImageByPublicId] unexpected result:', res.result, publicId)
    }
    return { ok: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    return { ok: false, reason }
  }
}
