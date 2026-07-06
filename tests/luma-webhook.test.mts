import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

process.env.DATABASE_URL ??= 'postgres://cursork:cursork@127.0.0.1:5432/cursork'

const {
  isLumaWebhookSignatureConfigured,
  isLumaWebhookTokenConfigured,
  isRetriableLumaWebhookDelivery,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
} = await import('../lib/luma/webhook.ts')

const originalSecret = process.env.LUMA_WEBHOOK_SECRET
const originalToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

function restoreEnv () {
  if (originalSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = originalSecret

  if (originalToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalToken
}

test.afterEach(() => {
  restoreEnv()
})

test('webhook authentication fails closed when credentials are unset', () => {
  delete process.env.LUMA_WEBHOOK_SECRET
  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

  const request = new Request('https://example.com/webhook?token=anything', {
    headers: {
      'x-webhook-token': 'anything',
      authorization: 'Bearer anything',
    },
  })

  assert.equal(isLumaWebhookSignatureConfigured(), false)
  assert.equal(isLumaWebhookTokenConfigured(), false)
  assert.equal(verifyLumaWebhookToken(request), false)
  assert.equal(verifyLumaWebhookSignature(request, '{}'), false)
})

test('webhook token verification accepts query, header, and bearer tokens only when configured', () => {
  process.env.LUMA_WEBHOOK_ROUTE_TOKEN = 'route-secret'

  assert.equal(isLumaWebhookTokenConfigured(), true)
  assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook?token=route-secret')), true)
  assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook', {
    headers: { 'x-webhook-token': 'route-secret' },
  })), true)
  assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook', {
    headers: { authorization: 'Bearer route-secret' },
  })), true)
  assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook?token=wrong')), false)
})

test('webhook signature verification accepts valid Luma signatures only when configured', () => {
  const rawBody = JSON.stringify({ type: 'event.created', data: { id: 'evt_1' } })
  const secretBytes = Buffer.from('test-secret')
  process.env.LUMA_WEBHOOK_SECRET = `whsec_${secretBytes.toString('base64')}`

  const id = 'msg_123'
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', secretBytes)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')

  const request = new Request('https://example.com/webhook', {
    headers: {
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${signature}`,
    },
  })

  assert.equal(isLumaWebhookSignatureConfigured(), true)
  assert.equal(verifyLumaWebhookSignature(request, rawBody), true)
  assert.equal(verifyLumaWebhookSignature(request, `${rawBody} `), false)
})

test('failed and stale processing webhook deliveries are retriable', () => {
  const now = new Date('2026-07-06T11:00:00.000Z')

  assert.equal(isRetriableLumaWebhookDelivery('failed', now, now), true)
  assert.equal(isRetriableLumaWebhookDelivery('processed', new Date('2026-07-06T10:00:00.000Z'), now), false)
  assert.equal(isRetriableLumaWebhookDelivery('ignored', new Date('2026-07-06T10:00:00.000Z'), now), false)
  assert.equal(isRetriableLumaWebhookDelivery('processing', new Date('2026-07-06T10:54:59.000Z'), now), true)
  assert.equal(isRetriableLumaWebhookDelivery('processing', new Date('2026-07-06T10:59:00.000Z'), now), false)
})
