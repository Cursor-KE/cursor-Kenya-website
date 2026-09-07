import { createHmac } from 'node:crypto'

export const SHOWCASE_SUBMISSION_RATE_LIMIT_WINDOW_MS = 15 * 60_000
export const SHOWCASE_SUBMISSION_EMAIL_LIMIT = 3
export const SHOWCASE_SUBMISSION_IP_LIMIT = 10
export const SHOWCASE_SUBMISSION_RATE_LIMIT_MESSAGE = 'Too many showcase submissions received. Try again later.'

export type ShowcaseSubmissionRateLimitReason = 'email' | 'ip'

export function getShowcaseSubmissionRateLimitReason (input: {
  emailSubmissions: number
  ipSubmissions: number | null
}): ShowcaseSubmissionRateLimitReason | null {
  if (input.emailSubmissions >= SHOWCASE_SUBMISSION_EMAIL_LIMIT) return 'email'
  if (input.ipSubmissions !== null && input.ipSubmissions >= SHOWCASE_SUBMISSION_IP_LIMIT) return 'ip'
  return null
}

export function hashShowcaseRateLimitValue (value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() || 'development-only-showcase-rate-limit-secret'
  return createHmac('sha256', secret).update(value).digest('hex')
}

export function getClientIpFromHeaders (requestHeaders: Pick<Headers, 'get'>): string | null {
  const forwardedFor = requestHeaders.get('x-forwarded-for')
  const forwardedIp = forwardedFor
    ?.split(',')
    .map((value) => value.trim())
    .find(Boolean)
  if (forwardedIp) return forwardedIp

  const realIp = requestHeaders.get('x-real-ip')?.trim()
  return realIp || null
}
