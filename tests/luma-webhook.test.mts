import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

const originalDatabaseUrl = process.env.DATABASE_URL
const originalWebhookSecret = process.env.LUMA_WEBHOOK_SECRET
const originalWebhookRouteToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

process.env.DATABASE_URL ||= 'postgres://cursork:cursork@127.0.0.1:5432/cursork'

const {
  hasLumaWebhookAuthentication,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
} = await import('../lib/luma/webhook.ts')
const { POST } = await import('../app/webhook/route.ts')

function restoreEnv () {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl
  if (originalWebhookSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = originalWebhookSecret
  if (originalWebhookRouteToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalWebhookRouteToken
}

function clearWebhookAuthEnv () {
  delete process.env.LUMA_WEBHOOK_SECRET
  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
}

test.afterEach(restoreEnv)

test('webhook POST fails closed when no webhook credential is configured', async () => {
  clearWebhookAuthEnv()

  const response = await POST(new Request('https://example.com/webhook', {
    method: 'POST',
    body: JSON.stringify({ type: 'event.updated', data: {} }),
  }))
  const body = await response.json() as { error?: string }

  assert.equal(response.status, 503)
  assert.equal(body.error, 'Webhook authentication is not configured')
  assert.equal(hasLumaWebhookAuthentication(), false)
})

test('webhook token verification accepts the configured token only', () => {
  clearWebhookAuthEnv()
  process.env.LUMA_WEBHOOK_ROUTE_TOKEN = 'route-token'

  assert.equal(hasLumaWebhookAuthentication(), true)
  assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook?token=route-token')), true)
  assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook?token=wrong')), false)
})

test('webhook signature verification accepts a matching svix signature', () => {
  clearWebhookAuthEnv()
  const secretBytes = Buffer.from('test webhook secret')
  process.env.LUMA_WEBHOOK_SECRET = `whsec_${secretBytes.toString('base64')}`
  const id = 'msg_123'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const rawBody = JSON.stringify({ type: 'event.updated', data: { id: 'evt_123' } })
  const signature = createHmac('sha256', secretBytes)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')

  const request = new Request('https://example.com/webhook', {
    headers: {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${signature}`,
    },
  })

  assert.equal(hasLumaWebhookAuthentication(), true)
  assert.equal(verifyLumaWebhookSignature(request, rawBody), true)
  assert.equal(verifyLumaWebhookSignature(request, `${rawBody} `), false)
})
