/**
 * Cloudinary folders for signed uploads and Admin API `prefix` listing.
 *
 * We keep two separate sub-folders so the public homepage gallery never
 * accidentally renders submitter screenshots from the community showcase
 * (and vice versa). Both can be overridden with env vars.
 *
 *   gallery → admin-curated event photos     (default `cursor-kenya/gallery`)
 *   showcase → submitter project screenshots (default `cursor-kenya/showcase`)
 *
 * The legacy root prefix (`cursor-kenya`) is still recognised for back-compat
 * (older assets uploaded before the split lived directly under it).
 */

export type CloudinaryUploadKind = 'gallery' | 'showcase'

const LEGACY_DEFAULT_PREFIX = 'cursor-kenya'

function readEnv (name: string): string | null {
  const raw = process.env[name]
  if (raw == null) return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

function legacyRootPrefix (): string {
  return readEnv('CLOUDINARY_UPLOAD_PREFIX') ?? LEGACY_DEFAULT_PREFIX
}

export function getCloudinaryGalleryFolder (): string {
  return readEnv('CLOUDINARY_GALLERY_PREFIX') ?? `${legacyRootPrefix()}/gallery`
}

export function getCloudinaryShowcaseFolder (): string {
  return readEnv('CLOUDINARY_SHOWCASE_PREFIX') ?? `${legacyRootPrefix()}/showcase`
}

export function getCloudinaryUploadFolder (kind: CloudinaryUploadKind = 'gallery'): string {
  return kind === 'showcase' ? getCloudinaryShowcaseFolder() : getCloudinaryGalleryFolder()
}
