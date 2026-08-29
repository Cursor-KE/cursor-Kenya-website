import { createHmac, timingSafeEqual } from 'node:crypto'

function safeEqual (a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
}

function parseSignatureHeader (header: string) {
  let timestamp: string | null = null
  const signatures: string[] = []

  for (const part of header.split(',')) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0) continue

    const key = part.slice(0, separatorIndex).trim()
    const value = part.slice(separatorIndex + 1).trim()
    if (!value) continue

    if (key === 't') timestamp = value
    if (key === 'v1') signatures.push(value)
  }

  return { timestamp, signatures }
}

export function isLumaWebhookAuthConfigured (): boolean {
  return Boolean(process.env.LUMA_WEBHOOK_SECRET || process.env.LUMA_WEBHOOK_ROUTE_TOKEN)
}

export function verifyLumaWebhookSignature (request: Request, rawBody: string): boolean {
  const secret = process.env.LUMA_WEBHOOK_SECRET
  if (!secret) return true

  const signatureHeader = request.headers.get('webhook-signature')
  if (!signatureHeader) return false

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader)
  if (!timestamp || signatures.length === 0) return false

  const timestampSeconds = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(timestampSeconds)) return false

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds)
  if (ageSeconds > 5 * 60) return false

  const signedContent = `${timestamp}.${rawBody}`
  const expected = createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex')

  return signatures.some((candidate) => safeEqual(candidate, expected))
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
