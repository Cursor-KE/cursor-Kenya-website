import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'

const configuredDatabaseUrl = process.env.DATABASE_URL
process.env.DATABASE_URL = configuredDatabaseUrl ?? 'postgres://cursork:cursork@127.0.0.1:5432/cursork'

const {
  hasLumaWebhookAuthenticationConfigured,
  verifyLumaWebhookToken,
} = await import('../lib/luma/webhook-auth.ts')
const { POST } = await import('../app/webhook/route.ts')
const { processLumaWebhookBody } = await import('../lib/luma/webhook.ts')

const dbModulesPromise = configuredDatabaseUrl
  ? Promise.all([
      import('../db/index.ts'),
      import('../db/schema.ts'),
    ])
  : null

const originalSecret = process.env.LUMA_WEBHOOK_SECRET
const originalRouteToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

function restoreWebhookEnv () {
  if (originalSecret === undefined) {
    delete process.env.LUMA_WEBHOOK_SECRET
  } else {
    process.env.LUMA_WEBHOOK_SECRET = originalSecret
  }

  if (originalRouteToken === undefined) {
    delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  } else {
    process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalRouteToken
  }
}

test.after(restoreWebhookEnv)

test('webhook route rejects posts when no verifier is configured', async () => {
  delete process.env.LUMA_WEBHOOK_SECRET
  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

  assert.equal(hasLumaWebhookAuthenticationConfigured(), false)

  const response = await POST(new Request('http://localhost/webhook', {
    method: 'POST',
    body: JSON.stringify({
      type: 'event.created',
      data: {
        id: 'evt_auth_guard',
        name: 'Auth Guard Test',
        start_at: '2026-07-02T12:00:00.000Z',
        url: 'https://lu.ma/auth-guard',
      },
    }),
  }))

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'Webhook authentication is not configured' })
})

test('webhook token verifier still accepts a configured bearer token', () => {
  delete process.env.LUMA_WEBHOOK_SECRET
  process.env.LUMA_WEBHOOK_ROUTE_TOKEN = 'route-token-123'

  const request = new Request('http://localhost/webhook', {
    headers: {
      authorization: 'Bearer route-token-123',
    },
  })

  assert.equal(hasLumaWebhookAuthenticationConfigured(), true)
  assert.equal(verifyLumaWebhookToken(request), true)
})

test('failed webhook delivery rows are retried instead of acknowledged as duplicates', async (t) => {
  if (!dbModulesPromise) {
    t.skip('DATABASE_URL is required for webhook retry integration coverage')
    return
  }

  const [{ db }, { lumaEvents, lumaWebhookDeliveries }] = await dbModulesPromise
  const eventId = `evt_retry_${Date.now()}`
  const rawBody = JSON.stringify({
    type: 'event.created',
    data: {
      id: eventId,
      name: 'Retryable Webhook Event',
      start_at: '2026-07-02T12:00:00.000Z',
      end_at: '2026-07-02T13:00:00.000Z',
      url: 'https://lu.ma/retryable-webhook-event',
      cover_url: 'https://images.example.com/retryable-webhook-event.png',
    },
  })
  const deliveryId = createHash('sha256').update(rawBody).digest('hex')
  const payload = JSON.parse(rawBody) as Record<string, unknown>

  await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
  await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryId))

  try {
    await db.insert(lumaWebhookDeliveries).values({
      id: deliveryId,
      eventType: 'event.created',
      lumaObjectId: eventId,
      payload,
      status: 'failed',
      error: 'transient failure',
      processedAt: new Date('2026-07-02T11:00:00.000Z'),
    })

    const result = await processLumaWebhookBody(rawBody)
    assert.equal(result.duplicate, false)
    assert.equal(result.status, 'processed')

    const [event] = await db
      .select()
      .from(lumaEvents)
      .where(eq(lumaEvents.id, eventId))
      .limit(1)
    assert.equal(event?.title, 'Retryable Webhook Event')

    const [delivery] = await db
      .select({
        status: lumaWebhookDeliveries.status,
        error: lumaWebhookDeliveries.error,
      })
      .from(lumaWebhookDeliveries)
      .where(eq(lumaWebhookDeliveries.id, deliveryId))
      .limit(1)
    assert.equal(delivery?.status, 'processed')
    assert.equal(delivery?.error, null)
  } finally {
    await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
    await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryId))
  }
})
