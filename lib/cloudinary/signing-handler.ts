import { getCloudinaryUploadFolder, type CloudinaryUploadKind } from '@/lib/cloudinary/folder'

export const SESSION_DB_UNAVAILABLE = 'SESSION_DB_UNAVAILABLE'
export const SESSION_UNAUTHORIZED = 'SESSION_UNAUTHORIZED'
export const ADMIN_APPROVAL_REQUIRED = 'ADMIN_APPROVAL_REQUIRED'
export const ADMIN_FORBIDDEN = 'ADMIN_FORBIDDEN'

type CloudinarySignSuccess = {
  status: number
  body: {
    cloudName: string
    apiKey: string
    timestamp: number
    signature: string
    folder: string
    kind: CloudinaryUploadKind
  }
}

type CloudinarySignFailure = {
  status: number
  body: { error: string }
}

export type CloudinarySignResponse = CloudinarySignSuccess | CloudinarySignFailure

export type CloudinarySignDeps = {
  requireApprovedAdmin: () => Promise<unknown>
  signRequest: (params: { timestamp: number; folder: string }, apiSecret: string) => string
  now?: () => number
}

export type CloudinarySignInput = {
  kind: unknown
  cloudName?: string
  apiKey?: string
  apiSecret?: string
}

function parseKind (value: unknown): CloudinaryUploadKind | null {
  if (value == null) return 'gallery'
  if (value === 'gallery' || value === 'showcase') return value
  return null
}

function handleAuthError (error: unknown): CloudinarySignFailure | null {
  if (error instanceof Error && error.message === SESSION_UNAUTHORIZED) {
    return { status: 401, body: { error: 'You must be signed in to upload gallery images.' } }
  }
  if (error instanceof Error && error.message === SESSION_DB_UNAVAILABLE) {
    return { status: 503, body: { error: 'Could not verify your session because the database is unavailable.' } }
  }
  if (error instanceof Error && error.message === ADMIN_APPROVAL_REQUIRED) {
    return { status: 403, body: { error: 'Your admin account is still waiting for super-user approval.' } }
  }
  if (error instanceof Error && error.message === ADMIN_FORBIDDEN) {
    return { status: 403, body: { error: 'You do not have permission to upload gallery images.' } }
  }
  return null
}

export async function handleCloudinarySignRequest (
  input: CloudinarySignInput,
  deps: CloudinarySignDeps
): Promise<CloudinarySignResponse> {
  const { cloudName, apiKey, apiSecret } = input
  if (!cloudName || !apiKey || !apiSecret) {
    return { status: 503, body: { error: 'Cloudinary is not configured' } }
  }

  const kind = parseKind(input.kind)
  if (!kind) {
    return { status: 400, body: { error: 'Upload kind must be either gallery or showcase.' } }
  }

  if (kind === 'gallery') {
    try {
      await deps.requireApprovedAdmin()
    } catch (error) {
      const handled = handleAuthError(error)
      if (handled) return handled
      throw error
    }
  }

  const folder = getCloudinaryUploadFolder(kind)
  const timestamp = Math.round((deps.now?.() ?? Date.now()) / 1000)
  const signature = deps.signRequest({ timestamp, folder }, apiSecret)

  return {
    status: 200,
    body: {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      kind,
    },
  }
}
