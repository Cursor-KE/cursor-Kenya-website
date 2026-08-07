import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { afterEach, test } from 'node:test'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { lumaEvents, lumaWebhookDeliveries } from '../db/schema.ts'
import { getLumaEvents } from '../lib/luma/client.ts'
import { processLumaWebhookBody } from '../lib/luma/webhook.ts'

const originalFetch = globalThis.fetch
const originalLumaApiKey = process.env.LUMA_API_KEY
const touchedEventIds = new Set<string>()
const touchedDeliveryIds = new Set<string>()

function sha256 (value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function makeEvent (id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: 'Cursor Kenya Meetup',
    start_at: '2026-08-01T10:00:00.000Z',
    end_at: '2026-08-01T12:00:00.000Z',
    url: `https://lu.ma/${id}`,
    cover_url: `https://cdn.example.com/${id}.png`,
    ...overrides,
  }
}

function makeWebhookBody (type: string, data: Record<string, unknown>) {
  const body = JSON.stringify({ type, data })
  touchedDeliveryIds.add(sha256(body))
  return body
}

async function cleanupRows () {
  const deliveryIds = [...touchedDeliveryIds]
  const eventIds = [...touchedEventIds]

  if (deliveryIds.length > 0) {
    await db
      .delete(lumaWebhookDeliveries)
      .where(inArray(lumaWebhookDeliveries.id, deliveryIds))
  }

  if (eventIds.length > 0) {
    await db
      .delete(lumaEvents)
      .where(inArray(lumaEvents.id, eventIds))
  }
}

function restoreGlobals () {
  globalThis.fetch = originalFetch
  if (originalLumaApiKey === undefined) delete process.env.LUMA_API_KEY
  else process.env.LUMA_API_KEY = originalLumaApiKey
}

afterEach(async () => {
  await cleanupRows()
  touchedDeliveryIds.clear()
  touchedEventIds.clear()
  restoreGlobals()
})

test('failed Luma webhook delivery retries process the payload instead of being acked as duplicates', async () => {
  const eventId = 'evt_retry_failure_regression'
  touchedEventIds.add(eventId)
  const rawBody = makeWebhookBody('event.created', makeEvent(eventId))
  const deliveryId = sha256(rawBody)
  await cleanupRows()

  await db.insert(lumaWebhookDeliveries).values({
    id: deliveryId,
    eventType: 'event.created',
    lumaObjectId: eventId,
    payload: JSON.parse(rawBody) as Record<string, unknown>,
    status: 'failed',
    error: 'transient database timeout',
    processedAt: new Date('2026-07-13T10:00:00.000Z'),
  })

  const result = await processLumaWebhookBody(rawBody)

  assert.equal(result.duplicate, true)
  assert.equal(result.status, 'processed')

  const [event] = await db
    .select({ id: lumaEvents.id, title: lumaEvents.title, status: lumaEvents.status })
    .from(lumaEvents)
    .where(eq(lumaEvents.id, eventId))
  assert.deepEqual(event, {
    id: eventId,
    title: 'Cursor Kenya Meetup',
    status: 'active',
  })

  const [delivery] = await db
    .select({ status: lumaWebhookDeliveries.status, error: lumaWebhookDeliveries.error })
    .from(lumaWebhookDeliveries)
    .where(eq(lumaWebhookDeliveries.id, deliveryId))
  assert.deepEqual(delivery, {
    status: 'processed',
    error: null,
  })
})

test('event.updated does not reactivate a canceled Luma event', async () => {
  const eventId = 'evt_canceled_update_regression'
  touchedEventIds.add(eventId)
  await cleanupRows()

  await processLumaWebhookBody(makeWebhookBody('event.created', makeEvent(eventId)))
  await processLumaWebhookBody(makeWebhookBody('event.canceled', makeEvent(eventId)))
  await processLumaWebhookBody(makeWebhookBody('event.updated', makeEvent(eventId, {
    name: 'Updated canceled meetup',
  })))

  const [event] = await db
    .select({ title: lumaEvents.title, status: lumaEvents.status })
    .from(lumaEvents)
    .where(eq(lumaEvents.id, eventId))

  assert.deepEqual(event, {
    title: 'Updated canceled meetup',
    status: 'canceled',
  })
})

test('public Luma event reads prefer complete API results and filter locally canceled IDs', async () => {
  const existingEventId = 'evt_existing_partial_regression'
  const fetchedEventId = 'evt_fetched_missing_regression'
  const canceledEventId = 'evt_canceled_filter_regression'
  touchedEventIds.add(existingEventId)
  touchedEventIds.add(fetchedEventId)
  touchedEventIds.add(canceledEventId)
  await cleanupRows()

  await db.insert(lumaEvents).values([
    {
      id: existingEventId,
      title: 'Stored partial meetup',
      startAt: new Date('2026-08-01T10:00:00.000Z'),
      endAt: null,
      url: `https://lu.ma/${existingEventId}`,
      coverUrl: null,
      status: 'active',
      rawPayload: makeEvent(existingEventId),
      updatedAt: new Date(),
    },
    {
      id: canceledEventId,
      title: 'Canceled meetup',
      startAt: new Date('2026-08-03T10:00:00.000Z'),
      endAt: null,
      url: `https://lu.ma/${canceledEventId}`,
      coverUrl: null,
      status: 'canceled',
      rawPayload: makeEvent(canceledEventId),
      updatedAt: new Date(),
    },
  ])

  process.env.LUMA_API_KEY = 'test-luma-key'
  globalThis.fetch = async () => new Response(JSON.stringify({
    entries: [
      { event: makeEvent(existingEventId, { name: 'Fetched existing meetup' }) },
      { event: makeEvent(fetchedEventId, { name: 'Fetched missing meetup' }) },
      { event: makeEvent(canceledEventId, { name: 'Fetched canceled meetup' }) },
    ],
    has_more: false,
    next_cursor: null,
  }), { status: 200 })

  const events = await getLumaEvents()

  assert.deepEqual(events.map((event) => event.id), [existingEventId, fetchedEventId])
  assert.deepEqual(events.map((event) => event.title), [
    'Fetched existing meetup',
    'Fetched missing meetup',
  ])

  const [persistedFetched] = await db
    .select({ status: lumaEvents.status })
    .from(lumaEvents)
    .where(eq(lumaEvents.id, fetchedEventId))
  assert.equal(persistedFetched?.status, 'active')

  const [canceled] = await db
    .select({ status: lumaEvents.status })
    .from(lumaEvents)
    .where(eq(lumaEvents.id, canceledEventId))
  assert.equal(canceled?.status, 'canceled')
})
