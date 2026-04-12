/**
 * Folder for signed uploads and Admin API `prefix` listing.
 * Must match the public_id prefix of assets in Cloudinary (e.g. `my-folder/image-id`).
 * Override with `CLOUDINARY_UPLOAD_PREFIX` if assets live outside the default.
 */
export function getCloudinaryUploadFolder (): string {
  const raw = process.env.CLOUDINARY_UPLOAD_PREFIX
  if (raw != null && raw.trim() !== '') return raw.trim()
  return 'cursor-kenya'
}
