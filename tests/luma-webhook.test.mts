import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

const originalSecret = process.env.LUMA_WEBHOOK_SECRET
const originalRouteToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

function restoreLumaEnv () {
  if (originalSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = originalSecret

  if (originalRouteToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalRouteToken
}

function signedRequest (body: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')

  return new Request('https://example.com/webhook', {
    method: 'POST',
    headers: {
      'Webhook-Id': 'webhook-event-1',
      'Webhook-Timestamp': timestamp,
      'Webhook-Signature': `t=${timestamp},v1=${signature}`,
    },
    body,
  })
}

test.afterEach(restoreLumaEnv)

test('verifies Luma webhook signatures using the documented t.raw_body hex digest', async () => {
  const { verifyLumaWebhookSignature } = await import('../lib/luma/webhook-auth.ts')
  const secret = 'whsec_test_secret'
  const body = JSON.stringify({
    type: 'event.created',
    data: {
      id: 'evt_1',
      name: 'Cursor Kenya Meetup',
      start_at: '2026-07-01T18:00:00.000Z',
      url: 'https://lu.ma/evt_1',
    },
  })

  process.env.LUMA_WEBHOOK_SECRET = secret

  assert.equal(verifyLumaWebhookSignature(signedRequest(body, secret), body), true)
})

test('rejects signatures generated from the old id.timestamp.body base64 scheme', async () => {
  const { verifyLumaWebhookSignature } = await import('../lib/luma/webhook-auth.ts')
  const secret = 'whsec_test_secret'
  const body = JSON.stringify({ type: 'event.updated', data: { id: 'evt_1' } })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret)
    .update(`webhook-event-1.${timestamp}.${body}`)
    .digest('base64')

  process.env.LUMA_WEBHOOK_SECRET = secret

  const request = new Request('https://example.com/webhook', {
    method: 'POST',
    headers: {
      'Webhook-Id': 'webhook-event-1',
      'Webhook-Timestamp': timestamp,
      'Webhook-Signature': `t=${timestamp},v1=${signature}`,
    },
    body,
  })

  assert.equal(verifyLumaWebhookSignature(request, body), false)
})

test('reports missing webhook authentication when no secret or route token is configured', async () => {
  const { isLumaWebhookAuthConfigured } = await import('../lib/luma/webhook-auth.ts')

  delete process.env.LUMA_WEBHOOK_SECRET
  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

  assert.equal(isLumaWebhookAuthConfigured(), false)
})
