import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const lumaWebhookEventTypeSchema = z.enum([
  'calendar.event.added',
  'calendar.person.subscribed',
  'event.canceled',
  'event.created',
  'event.updated',
  'guest.registered',
  'guest.updated',
  'ticket.registered',
])

const lumaWebhookPayloadSchema = z.object({
  type: lumaWebhookEventTypeSchema,
  data: z.unknown(),
})

type LumaWebhookEventType = z.infer<typeof lumaWebhookEventTypeSchema>
type LumaWebhookPayload = z.infer<typeof lumaWebhookPayloadSchema>

type DeliveryStatus = 'processed' | 'ignored' | 'failed'
type StoredDeliveryStatus = DeliveryStatus | 'processing'

type DeliveryInsert = {
  id: string
  eventType: LumaWebhookEventType
  lumaObjectId: string | null
  payload: Record<string, unknown>
}

type DeliveryUpdate = {
  status: StoredDeliveryStatus
  error?: string | null
  processedAt?: Date | null
}

type ProcessLumaWebhookDeps = {
  insertDelivery: (delivery: DeliveryInsert) => Promise<boolean>
  getDeliveryStatus: (deliveryId: string) => Promise<StoredDeliveryStatus | null>
  markDeliveryProcessing: (deliveryId: string) => Promise<void>
  updateDelivery: (deliveryId: string, update: DeliveryUpdate) => Promise<void>
  handlePayload: (payload: LumaWebhookPayload) => Promise<DeliveryStatus>
  revalidate: () => void
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString (value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function sha256 (value: string): string {
  return createHash('sha256').update(value).digest('hex')
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

export function isLumaWebhookAuthConfigured (): boolean {
  return Boolean(process.env.LUMA_WEBHOOK_SECRET || process.env.LUMA_WEBHOOK_ROUTE_TOKEN)
}

export function getLumaObjectId (payload: LumaWebhookPayload): string | null {
  if (!isRecord(payload.data)) return null
  const ticket = isRecord(payload.data.event_ticket) ? payload.data.event_ticket : null
  return asString(payload.data.id) ?? asString(ticket?.id) ?? asString(payload.data.event_id)
}

export async function processLumaWebhookBodyWithDeps (
  rawBody: string,
  deps: ProcessLumaWebhookDeps
) {
  const deliveryId = sha256(rawBody)
  const json = JSON.parse(rawBody) as unknown
  const payload = lumaWebhookPayloadSchema.parse(json)
  const payloadRecord = isRecord(json) ? json : { type: payload.type, data: payload.data }
  const objectId = getLumaObjectId(payload)

  const inserted = await deps.insertDelivery({
    id: deliveryId,
    eventType: payload.type,
    lumaObjectId: objectId,
    payload: payloadRecord,
  })

  if (!inserted) {
    const existingStatus = await deps.getDeliveryStatus(deliveryId)
    if (existingStatus === 'processed' || existingStatus === 'ignored') {
      return { duplicate: true, eventType: payload.type, objectId, status: existingStatus }
    }

    if (existingStatus === 'processing') {
      return {
        duplicate: true,
        eventType: payload.type,
        objectId,
        status: existingStatus,
        retryable: true,
      }
    }

    await deps.markDeliveryProcessing(deliveryId)
  }

  try {
    const status = await deps.handlePayload(payload)

    await deps.updateDelivery(deliveryId, {
      status,
      processedAt: new Date(),
    })

    if (status === 'processed') {
      deps.revalidate()
    }

    return { duplicate: false, eventType: payload.type, objectId, status }
  } catch (error) {
    await deps.updateDelivery(deliveryId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown webhook processing error',
      processedAt: new Date(),
    })

    throw error
  }
}

export type {
  DeliveryInsert,
  DeliveryStatus,
  DeliveryUpdate,
  LumaWebhookEventType,
  LumaWebhookPayload,
  ProcessLumaWebhookDeps,
  StoredDeliveryStatus,
}
