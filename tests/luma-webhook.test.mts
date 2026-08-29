import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { lumaEvents, lumaWebhookDeliveries } from '../db/schema.ts'
import { POST } from '../app/webhook/route.ts'
import { processLumaWebhookBody } from '../lib/luma/webhook.ts'

const eventPayload = {
  type: 'event.created',
  data: {
    id: 'evt_webhook_retry_test',
    name: 'Webhook Retry Test',
    start_at: '2026-08-01T10:00:00.000Z',
    end_at: '2026-08-01T12:00:00.000Z',
    url: 'https://lu.ma/webhook-retry-test',
    cover_url: 'https://example.com/cover.png',
  },
}

function deliveryIdFor (rawBody: string): string {
  return createHash('sha256').update(rawBody).digest('hex')
}

function withWebhookEnv<T> (env: { secret?: string; token?: string }, fn: () => Promise<T>): Promise<T> {
  const previousSecret = process.env.LUMA_WEBHOOK_SECRET
  const previousToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

  if (env.secret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = env.secret

  if (env.token === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = env.token

  return fn().finally(() => {
    if (previousSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
    else process.env.LUMA_WEBHOOK_SECRET = previousSecret

    if (previousToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
    else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = previousToken
  })
}

async function cleanupWebhookRows (rawBody: string) {
  await db.delete(lumaEvents).where(eq(lumaEvents.id, eventPayload.data.id))
  await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryIdFor(rawBody)))
}

test('luma webhook route fails closed when no auth mechanism is configured', async () => {
  await withWebhookEnv({}, async () => {
    const response = await POST(new Request('https://example.com/webhook', {
      method: 'POST',
      body: JSON.stringify(eventPayload),
    }))

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'Webhook authentication is not configured' })
  })
})

test('failed luma webhook deliveries are reprocessed on retry', async () => {
  const rawBody = JSON.stringify(eventPayload)
  const deliveryId = deliveryIdFor(rawBody)

  await cleanupWebhookRows(rawBody)
  try {
    await db.insert(lumaWebhookDeliveries).values({
      id: deliveryId,
      eventType: eventPayload.type,
      lumaObjectId: eventPayload.data.id,
      payload: eventPayload,
      status: 'failed',
      error: 'transient database failure',
      processedAt: new Date('2026-07-18T10:00:00.000Z'),
    })

    const result = await processLumaWebhookBody(rawBody)
    if (result.duplicate) {
      assert.fail('failed webhook retry should be processed, not treated as a terminal duplicate')
    }
    assert.equal(result.status, 'processed')

    const [event] = await db.select().from(lumaEvents).where(eq(lumaEvents.id, eventPayload.data.id)).limit(1)
    assert.equal(event?.title, eventPayload.data.name)

    const [delivery] = await db.select().from(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryId)).limit(1)
    assert.equal(delivery?.status, 'processed')
    assert.equal(delivery?.error, null)
  } finally {
    await cleanupWebhookRows(rawBody)
  }
})
