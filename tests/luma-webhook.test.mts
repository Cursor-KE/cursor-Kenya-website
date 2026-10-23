import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isLumaWebhookVerificationConfigured,
  shouldReplayLumaWebhookDelivery,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
} from '../lib/luma/webhook.ts'

const originalWebhookSecret = process.env.LUMA_WEBHOOK_SECRET
const originalWebhookRouteToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

function resetWebhookEnv () {
  if (originalWebhookSecret === undefined) {
    delete process.env.LUMA_WEBHOOK_SECRET
  } else {
    process.env.LUMA_WEBHOOK_SECRET = originalWebhookSecret
  }

  if (originalWebhookRouteToken === undefined) {
    delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  } else {
    process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalWebhookRouteToken
  }
}

test.afterEach(() => {
  resetWebhookEnv()
})

test('webhook retries replay failed or interrupted deliveries only', () => {
  assert.equal(shouldReplayLumaWebhookDelivery('failed'), true)
  assert.equal(shouldReplayLumaWebhookDelivery('processing'), true)
  assert.equal(shouldReplayLumaWebhookDelivery('processed'), false)
  assert.equal(shouldReplayLumaWebhookDelivery('ignored'), false)
  assert.equal(shouldReplayLumaWebhookDelivery(null), false)
})

test('webhook verification fails closed when no verifier is configured', () => {
  delete process.env.LUMA_WEBHOOK_SECRET
  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

  assert.equal(isLumaWebhookVerificationConfigured(), false)
})

test('webhook verification accepts a configured route token without a signature secret', () => {
  delete process.env.LUMA_WEBHOOK_SECRET
  process.env.LUMA_WEBHOOK_ROUTE_TOKEN = 'route-secret'

  const request = new Request('https://example.com/webhook', {
    headers: {
      authorization: 'Bearer route-secret',
    },
  })

  assert.equal(isLumaWebhookVerificationConfigured(), true)
  assert.equal(verifyLumaWebhookToken(request), true)
  assert.equal(verifyLumaWebhookSignature(request, '{}'), true)
})
