import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import {
  allowUnverifiedLumaWebhooks,
  isLumaWebhookSignatureConfigured,
  isLumaWebhookTokenConfigured,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
} from '../lib/luma/webhook-auth.ts'

const envKeys = [
  'LUMA_WEBHOOK_ALLOW_UNVERIFIED',
  'LUMA_WEBHOOK_ROUTE_TOKEN',
  'LUMA_WEBHOOK_SECRET',
  'NODE_ENV',
] as const

function withEnv (values: Partial<Record<(typeof envKeys)[number], string>>, fn: () => void) {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]))

  for (const key of envKeys) {
    delete process.env[key]
  }

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value
  }

  try {
    fn()
  } finally {
    for (const key of envKeys) {
      const value = previous[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('webhook auth fails closed in production when no verifier is configured', () => {
  withEnv({ NODE_ENV: 'production' }, () => {
    const request = new Request('https://example.com/webhook')

    assert.equal(isLumaWebhookTokenConfigured(), false)
    assert.equal(isLumaWebhookSignatureConfigured(), false)
    assert.equal(allowUnverifiedLumaWebhooks(), false)
    assert.equal(verifyLumaWebhookToken(request), false)
    assert.equal(verifyLumaWebhookSignature(request, '{}'), false)
  })
})

test('unverified webhooks require an explicit non-production opt-in', () => {
  withEnv({ NODE_ENV: 'development', LUMA_WEBHOOK_ALLOW_UNVERIFIED: '1' }, () => {
    const request = new Request('https://example.com/webhook')

    assert.equal(allowUnverifiedLumaWebhooks(), true)
    assert.equal(verifyLumaWebhookToken(request), true)
    assert.equal(verifyLumaWebhookSignature(request, '{}'), true)
  })
})

test('webhook route token accepts supported locations and rejects mismatches', () => {
  withEnv({ NODE_ENV: 'production', LUMA_WEBHOOK_ROUTE_TOKEN: 'route-secret' }, () => {
    assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook?token=route-secret')), true)
    assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook', {
      headers: { 'x-webhook-token': 'route-secret' },
    })), true)
    assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook', {
      headers: { authorization: 'Bearer route-secret' },
    })), true)
    assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook?token=wrong')), false)
  })
})

test('webhook signature validates signed body and rejects stale timestamps', () => {
  const rawBody = '{"type":"event.updated","data":{"id":"evt_1"}}'
  const secret = Buffer.from('test-signing-secret').toString('base64')
  const timestamp = String(Math.floor(Date.now() / 1000))
  const webhookId = 'msg_1'
  const signature = createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(`${webhookId}.${timestamp}.${rawBody}`)
    .digest('base64')

  withEnv({ NODE_ENV: 'production', LUMA_WEBHOOK_SECRET: `whsec_${secret}` }, () => {
    const request = new Request('https://example.com/webhook', {
      headers: {
        'webhook-id': webhookId,
        'webhook-timestamp': timestamp,
        'webhook-signature': `v1,${signature}`,
      },
    })

    assert.equal(verifyLumaWebhookSignature(request, rawBody), true)

    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 10 * 60)
    const staleSignature = createHmac('sha256', Buffer.from(secret, 'base64'))
      .update(`${webhookId}.${staleTimestamp}.${rawBody}`)
      .digest('base64')
    const staleRequest = new Request('https://example.com/webhook', {
      headers: {
        'webhook-id': webhookId,
        'webhook-timestamp': staleTimestamp,
        'webhook-signature': `v1,${staleSignature}`,
      },
    })

    assert.equal(verifyLumaWebhookSignature(staleRequest, rawBody), false)
  })
})
