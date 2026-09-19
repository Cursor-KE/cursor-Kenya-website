import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

function asString (value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function safeEqual (a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

function decodeWebhookSecret (secret: string): Buffer {
  const encoded = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  return Buffer.from(encoded, 'base64')
}

function getSignatureHeaders (request: Request) {
  return {
    id: request.headers.get('webhook-id') ?? request.headers.get('svix-id'),
    timestamp: request.headers.get('webhook-timestamp') ?? request.headers.get('svix-timestamp'),
    signature: request.headers.get('webhook-signature') ?? request.headers.get('svix-signature'),
  }
}

function parseSignatures (header: string): string[] {
  return header
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.includes(',') ? ',' : '='
      const separatorIndex = part.indexOf(separator)
      const version = separatorIndex >= 0 ? part.slice(0, separatorIndex) : ''
      const signature = separatorIndex >= 0 ? part.slice(separatorIndex + 1) : ''
      return version === 'v1' && signature ? signature : part
    })
}

export function hasLumaWebhookAuthenticationConfigured (): boolean {
  return Boolean(
    asString(process.env.LUMA_WEBHOOK_SECRET) ||
    asString(process.env.LUMA_WEBHOOK_ROUTE_TOKEN)
  )
}

export function verifyLumaWebhookSignature (request: Request, rawBody: string): boolean {
  const secret = process.env.LUMA_WEBHOOK_SECRET
  if (!secret) return true

  const { id, timestamp, signature } = getSignatureHeaders(request)
  if (!id || !timestamp || !signature) return false

  const timestampSeconds = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(timestampSeconds)) return false

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds)
  if (ageSeconds > 5 * 60) return false

  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = createHmac('sha256', decodeWebhookSecret(secret))
    .update(signedContent)
    .digest('base64')

  return parseSignatures(signature).some((candidate) => safeEqual(candidate, expected))
}

export function verifyLumaWebhookToken (request: Request): boolean {
  const expected = process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  if (!expected) return true

  const url = new URL(request.url)
  const queryToken = url.searchParams.get('token')
  const headerToken = request.headers.get('x-webhook-token')
  const auth = request.headers.get('authorization')
  const bearerToken = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null

  return [queryToken, headerToken, bearerToken].some((candidate) => (
    Boolean(candidate) && safeEqual(candidate ?? '', expected)
  ))
}
