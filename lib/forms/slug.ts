import { nanoid } from 'nanoid'

export function normalizeFormSlug (input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function generateDefaultFormSlug () {
  return `form-${nanoid(8).toLowerCase()}`
}

export function ensureFormSlug (
  input: string,
  fallbackSeed?: string,
  fallbackValue = generateDefaultFormSlug()
) {
  const normalized = normalizeFormSlug(input)
  if (normalized) return normalized

  const fromSeed = normalizeFormSlug(fallbackSeed ?? '')
  if (fromSeed) return fromSeed

  return fallbackValue
}
