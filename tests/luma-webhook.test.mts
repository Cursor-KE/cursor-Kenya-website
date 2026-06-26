import 'dotenv/config'

import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'

const webhookModules = process.env.DATABASE_URL
  ? Promise.all([
    import('../lib/luma/webhook.ts'),
    import('../db/index.ts'),
    import('../db/schema.ts'),
  ])
  : null

let isDatabaseReachable: boolean | null = null

function deliveryIdFor (rawBody: string) {
  return createHash('sha256').update(rawBody).digest('hex')
}

function eventData (id: string) {
  return {
    id,
    name: `Webhook Test ${id}`,
    start_at: '2030-01-01T10:00:00.000Z',
    end_at: '2030-01-01T11:00:00.000Z',
    url: `https://lu.ma/${id}`,
    cover_url: null,
  }
}

function eventBody (type: 'event.created' | 'event.updated' | 'event.canceled', id: string) {
  return JSON.stringify({
    type,
    data: eventData(id),
  })
}

async function getModules (t: TestContext) {
  if (!webhookModules) {
    t.skip('DATABASE_URL is not set; skipping DB-backed Luma webhook tests')
    return null
  }

  const [webhook, dbModule, schema] = await webhookModules

  if (isDatabaseReachable === null) {
    try {
      await dbModule.db.execute(sql`select 1`)
      isDatabaseReachable = true
    } catch {
      isDatabaseReachable = false
    }
  }

  if (!isDatabaseReachable) {
    t.skip('Database is not reachable; skipping DB-backed Luma webhook tests')
    return null
  }

  return {
    webhook,
    db: dbModule.db,
    schema,
  }
}

type WebhookTestModules = NonNullable<Awaited<ReturnType<typeof getModules>>>

async function cleanupRows (
  db: WebhookTestModules['db'],
  schema: WebhookTestModules['schema'],
  eventId: string,
  rawBodies: string[]
) {
  for (const rawBody of rawBodies) {
    await db
      .delete(schema.lumaWebhookDeliveries)
      .where(eq(schema.lumaWebhookDeliveries.id, deliveryIdFor(rawBody)))
  }

  await db.delete(schema.lumaTickets).where(eq(schema.lumaTickets.eventId, eventId))
  await db.delete(schema.lumaGuests).where(eq(schema.lumaGuests.eventId, eventId))
  await db.delete(schema.lumaEvents).where(eq(schema.lumaEvents.id, eventId))
}

test('reprocesses a failed Luma webhook delivery instead of dropping the retry', async (t) => {
  const modules = await getModules(t)
  if (!modules) return

  const { webhook, db, schema } = modules
  const eventId = `evt_failed_retry_${Date.now()}`
  const rawBody = eventBody('event.created', eventId)
  await cleanupRows(db, schema, eventId, [rawBody])

  try {
    await db.insert(schema.lumaWebhookDeliveries).values({
      id: deliveryIdFor(rawBody),
      eventType: 'event.created',
      lumaObjectId: eventId,
      payload: JSON.parse(rawBody),
      status: 'failed',
      error: 'temporary database outage',
      processedAt: new Date(),
    })

    const result = await webhook.processLumaWebhookBody(rawBody)
    assert.equal(result.duplicate, false)
    assert.equal(result.status, 'processed')

    const [event] = await db
      .select({ status: schema.lumaEvents.status })
      .from(schema.lumaEvents)
      .where(eq(schema.lumaEvents.id, eventId))
      .limit(1)
    assert.equal(event?.status, 'active')

    const [delivery] = await db
      .select({
        status: schema.lumaWebhookDeliveries.status,
        error: schema.lumaWebhookDeliveries.error,
      })
      .from(schema.lumaWebhookDeliveries)
      .where(eq(schema.lumaWebhookDeliveries.id, deliveryIdFor(rawBody)))
      .limit(1)
    assert.equal(delivery?.status, 'processed')
    assert.equal(delivery?.error, null)
  } finally {
    await cleanupRows(db, schema, eventId, [rawBody])
  }
})

test('rejects an in-flight duplicate Luma delivery so providers keep retrying if it fails', async (t) => {
  const modules = await getModules(t)
  if (!modules) return

  const { webhook, db, schema } = modules
  const eventId = `evt_processing_retry_${Date.now()}`
  const rawBody = eventBody('event.created', eventId)
  await cleanupRows(db, schema, eventId, [rawBody])

  try {
    await db.insert(schema.lumaWebhookDeliveries).values({
      id: deliveryIdFor(rawBody),
      eventType: 'event.created',
      lumaObjectId: eventId,
      payload: JSON.parse(rawBody),
      status: 'processing',
      receivedAt: new Date(),
    })

    await assert.rejects(
      () => webhook.processLumaWebhookBody(rawBody),
      /already processing/
    )

    const [event] = await db
      .select({ id: schema.lumaEvents.id })
      .from(schema.lumaEvents)
      .where(eq(schema.lumaEvents.id, eventId))
      .limit(1)
    assert.equal(event, undefined)
  } finally {
    await cleanupRows(db, schema, eventId, [rawBody])
  }
})

test('keeps processed Luma webhook retries idempotent', async (t) => {
  const modules = await getModules(t)
  if (!modules) return

  const { webhook, db, schema } = modules
  const eventId = `evt_processed_duplicate_${Date.now()}`
  const rawBody = eventBody('event.created', eventId)
  await cleanupRows(db, schema, eventId, [rawBody])

  try {
    const firstResult = await webhook.processLumaWebhookBody(rawBody)
    const secondResult = await webhook.processLumaWebhookBody(rawBody)

    assert.equal(firstResult.duplicate, false)
    assert.equal(firstResult.status, 'processed')
    assert.equal(secondResult.duplicate, true)
    assert.equal(secondResult.status, 'processed')
  } finally {
    await cleanupRows(db, schema, eventId, [rawBody])
  }
})

test('does not resurrect a canceled Luma event from a later stale update', async (t) => {
  const modules = await getModules(t)
  if (!modules) return

  const { webhook, db, schema } = modules
  const eventId = `evt_canceled_update_${Date.now()}`
  const createdBody = eventBody('event.created', eventId)
  const canceledBody = eventBody('event.canceled', eventId)
  const updatedBody = eventBody('event.updated', eventId)
  await cleanupRows(db, schema, eventId, [createdBody, canceledBody, updatedBody])

  try {
    await webhook.processLumaWebhookBody(createdBody)
    await webhook.processLumaWebhookBody(canceledBody)
    await webhook.processLumaWebhookBody(updatedBody)

    const [event] = await db
      .select({ status: schema.lumaEvents.status })
      .from(schema.lumaEvents)
      .where(eq(schema.lumaEvents.id, eventId))
      .limit(1)
    assert.equal(event?.status, 'canceled')
  } finally {
    await cleanupRows(db, schema, eventId, [createdBody, canceledBody, updatedBody])
  }
})

test('fails closed for unauthenticated production webhooks when no auth mechanism is configured', async (t) => {
  const modules = await getModules(t)
  if (!modules) return

  const originalNodeEnv = process.env.NODE_ENV
  const originalSecret = process.env.LUMA_WEBHOOK_SECRET
  const originalToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

  try {
    process.env.NODE_ENV = 'production'
    delete process.env.LUMA_WEBHOOK_SECRET
    delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

    const request = new Request('https://cursor.ke/webhook', { method: 'POST' })
    assert.equal(modules.webhook.verifyLumaWebhookToken(request), false)
    assert.equal(modules.webhook.verifyLumaWebhookSignature(request, '{}'), false)
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
    else process.env.LUMA_WEBHOOK_SECRET = originalSecret
    if (originalToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
    else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalToken
  }
})
