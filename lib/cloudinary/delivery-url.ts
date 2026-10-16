const CLOUDINARY_DELIVERY_HOST = 'res.cloudinary.com'

export function isCloudinaryDeliveryUrl (raw: string) {
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'https:' && url.hostname === CLOUDINARY_DELIVERY_HOST && url.pathname.includes('/upload/')
  } catch {
    return false
  }
}

/** Smaller delivery URL for mosaic thumbnails (Cloudinary automatic format/quality). */
export function cloudinaryScaledUrl (secureUrl: string, width: number) {
  const trimmedUrl = secureUrl.trim()
  if (!isCloudinaryDeliveryUrl(trimmedUrl)) return trimmedUrl
  return trimmedUrl.replace('/upload/', `/upload/c_scale,w_${width},q_auto,f_auto/`)
}
