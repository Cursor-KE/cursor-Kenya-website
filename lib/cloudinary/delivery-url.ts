/** Smaller delivery URL for mosaic thumbnails (Cloudinary automatic format/quality). */
export function cloudinaryScaledUrl (secureUrl: string, width: number) {
  if (!secureUrl.includes('/upload/')) return secureUrl
  return secureUrl.replace('/upload/', `/upload/c_scale,w_${width},q_auto,f_auto/`)
}
