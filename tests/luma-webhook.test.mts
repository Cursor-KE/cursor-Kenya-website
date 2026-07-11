import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  verifyLumaWebhookRequest,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
} from '../lib/luma/webhook-auth.ts'
import {
  LUMA_WEBHOOK_PROCESSING_STALE_MS,
  isRetryableLumaDelivery,
} from '../lib/luma/webhook-delivery.ts'

const originalSecret = process.env.LUMA_WEBHOOK_SECRET
const originalToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

function restoreWebhookEnv () {
  if (originalSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = originalSecret

  if (originalToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalToken
}

function clearWebhookEnv () {
  delete process.env.LUMA_WEBHOOK_SECRET
  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
}

function signedRequest (body: string, secret: string) {
  const id = 'msg_123'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64')

  return new Request('https://example.com/webhook', {
    method: 'POST',
    headers: {
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${signature}`,
    },
    body,
  })
}

test('Luma webhook auth fails closed when no verifier is configured', (t) => {
  t.after(restoreWebhookEnv)
  clearWebhookEnv()

  const request = new Request('https://example.com/webhook', {
    method: 'POST',
    body: '{"type":"event.created","data":{}}',
  })

  assert.equal(verifyLumaWebhookToken(request), false)
  assert.equal(verifyLumaWebhookSignature(request, '{"type":"event.created","data":{}}'), false)
  assert.equal(verifyLumaWebhookRequest(request, '{"type":"event.created","data":{}}'), false)
})

test('Luma webhook auth accepts a configured route token without a signature', (t) => {
  t.after(restoreWebhookEnv)
  clearWebhookEnv()
  process.env.LUMA_WEBHOOK_ROUTE_TOKEN = 'route-secret'

  const request = new Request('https://example.com/webhook?token=route-secret', {
    method: 'POST',
    body: '{"type":"event.created","data":{}}',
  })

  assert.equal(verifyLumaWebhookRequest(request, '{"type":"event.created","data":{}}'), true)
})

test('Luma webhook auth accepts a configured Svix signature without a route token', (t) => {
  t.after(restoreWebhookEnv)
  clearWebhookEnv()
  const secret = Buffer.from('luma-webhook-secret').toString('base64')
  process.env.LUMA_WEBHOOK_SECRET = `whsec_${secret}`
  const body = '{"type":"event.created","data":{"id":"evt_1"}}'

  assert.equal(verifyLumaWebhookRequest(signedRequest(body, secret), body), true)
})

test('Luma delivery retry classification only retries failed or stale processing rows', () => {
  const now = new Date('2026-07-11T11:00:00.000Z')
  const staleProcessing = new Date(now.getTime() - LUMA_WEBHOOK_PROCESSING_STALE_MS - 1)
  const recentProcessing = new Date(now.getTime() - LUMA_WEBHOOK_PROCESSING_STALE_MS + 1)

  assert.equal(isRetryableLumaDelivery('failed', recentProcessing, now), true)
  assert.equal(isRetryableLumaDelivery('processing', staleProcessing, now), true)
  assert.equal(isRetryableLumaDelivery('processing', recentProcessing, now), false)
  assert.equal(isRetryableLumaDelivery('processed', staleProcessing, now), false)
  assert.equal(isRetryableLumaDelivery('ignored', staleProcessing, now), false)
})
