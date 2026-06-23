import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { lumaEvents, lumaWebhookDeliveries } from '@/db/schema'

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

function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString (value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function asDate (value: unknown): Date | null {
  const raw = asString(value)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
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

function getLumaObjectId (payload: LumaWebhookPayload): string | null {
  if (!isRecord(payload.data)) return null
  return asString(payload.data.id) ?? asString(payload.data.event_id)
}

function mapEventData (data: unknown, status: 'active' | 'canceled') {
  if (!isRecord(data)) return null

  const id = asString(data.id)
  const title = asString(data.name)
  const startAt = asDate(data.start_at)
  const url = asString(data.url)

  if (!id || !title || !startAt || !url) return null

  return {
    id,
    title,
    startAt,
    endAt: asDate(data.end_at),
    url,
    coverUrl: asString(data.cover_url),
    status,
    rawPayload: data,
    updatedAt: new Date(),
  }
}

async function upsertLumaEvent (data: unknown, status: 'active' | 'canceled') {
  const event = mapEventData(data, status)
  if (!event) return false

  await db
    .insert(lumaEvents)
    .values(event)
    .onConflictDoUpdate({
      target: lumaEvents.id,
      set: {
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        url: event.url,
        coverUrl: event.coverUrl,
        status: event.status,
        rawPayload: event.rawPayload,
        updatedAt: event.updatedAt,
      },
    })

  return true
}

async function markLumaEventCanceled (payload: LumaWebhookPayload) {
  const updated = await upsertLumaEvent(payload.data, 'canceled')
  if (updated) return true

  const id = getLumaObjectId(payload)
  if (!id) return false

  await db
    .update(lumaEvents)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(eq(lumaEvents.id, id))

  return true
}

async function handleWebhookPayload (payload: LumaWebhookPayload): Promise<DeliveryStatus> {
  switch (payload.type) {
    case 'calendar.event.added':
    case 'event.created':
    case 'event.updated':
      return await upsertLumaEvent(payload.data, 'active') ? 'processed' : 'ignored'
    case 'event.canceled':
      return await markLumaEventCanceled(payload) ? 'processed' : 'ignored'
    case 'calendar.person.subscribed':
    case 'guest.registered':
    case 'guest.updated':
    case 'ticket.registered':
      return 'ignored'
    default:
      payload.type satisfies never
      return 'ignored'
  }
}

export async function processLumaWebhookBody (rawBody: string) {
  const deliveryId = sha256(rawBody)
  const json = JSON.parse(rawBody) as unknown
  const payload = lumaWebhookPayloadSchema.parse(json)
  const payloadRecord = isRecord(json) ? json : { type: payload.type, data: payload.data }
  const objectId = getLumaObjectId(payload)

  const inserted = await db
    .insert(lumaWebhookDeliveries)
    .values({
      id: deliveryId,
      eventType: payload.type,
      lumaObjectId: objectId,
      payload: payloadRecord,
      status: 'processing',
    })
    .onConflictDoNothing()
    .returning({ id: lumaWebhookDeliveries.id })

  if (inserted.length === 0) {
    return { duplicate: true, eventType: payload.type, objectId }
  }

  try {
    const status = await handleWebhookPayload(payload)

    await db
      .update(lumaWebhookDeliveries)
      .set({
        status,
        processedAt: new Date(),
      })
      .where(eq(lumaWebhookDeliveries.id, deliveryId))

    if (status === 'processed') {
      revalidatePath('/')
      revalidatePath('/events')
    }

    return { duplicate: false, eventType: payload.type, objectId, status }
  } catch (error) {
    await db
      .update(lumaWebhookDeliveries)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown webhook processing error',
        processedAt: new Date(),
      })
      .where(eq(lumaWebhookDeliveries.id, deliveryId))

    throw error
  }
}

export type { LumaWebhookEventType }
