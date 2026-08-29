import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import {
  hasLumaWebhookAuthentication,
  processLumaWebhookBodyWithDependencies,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
  type DeliveryStatus,
  type LumaWebhookDeliveryInput,
  type LumaWebhookPayload,
  type ProcessLumaWebhookDependencies,
  type StoredDeliveryStatus,
} from '../lib/luma/webhook-core.ts'

const originalSecret = process.env.LUMA_WEBHOOK_SECRET
const originalRouteToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

type StoredDelivery = LumaWebhookDeliveryInput & {
  status: StoredDeliveryStatus
  error: string | null
}

function restoreWebhookEnv () {
  if (originalSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = originalSecret

  if (originalRouteToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalRouteToken
}

function createMemoryDeps (
  deliveries: Map<string, StoredDelivery>,
  handlePayload: (payload: LumaWebhookPayload) => Promise<DeliveryStatus>
): ProcessLumaWebhookDependencies {
  return {
    insertDelivery: async (delivery) => {
      if (deliveries.has(delivery.id)) return false
      deliveries.set(delivery.id, { ...delivery, status: 'processing', error: null })
      return true
    },
    getDeliveryStatus: async (id) => deliveries.get(id)?.status ?? null,
    markDeliveryProcessing: async (delivery) => {
      deliveries.set(delivery.id, { ...delivery, status: 'processing', error: null })
    },
    markDeliveryProcessed: async (id, status) => {
      const delivery = deliveries.get(id)
      assert.ok(delivery)
      deliveries.set(id, { ...delivery, status, error: null })
    },
    markDeliveryFailed: async (id, error) => {
      const delivery = deliveries.get(id)
      assert.ok(delivery)
      deliveries.set(id, { ...delivery, status: 'failed', error })
    },
    handlePayload,
    revalidatePath: () => {},
  }
}

test('webhook authentication must be configured before requests are accepted', () => {
  try {
    delete process.env.LUMA_WEBHOOK_SECRET
    delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

    assert.equal(hasLumaWebhookAuthentication(), false)
    assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook')), true)
    assert.equal(verifyLumaWebhookSignature(new Request('https://example.com/webhook'), '{}'), true)

    process.env.LUMA_WEBHOOK_ROUTE_TOKEN = 'route-secret'
    assert.equal(hasLumaWebhookAuthentication(), true)
    assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook')), false)
    assert.equal(verifyLumaWebhookToken(new Request('https://example.com/webhook?token=route-secret')), true)
  } finally {
    restoreWebhookEnv()
  }
})

test('webhook signatures are verified when a Luma secret is configured', () => {
  try {
    const rawBody = JSON.stringify({ type: 'event.created', data: { id: 'evt_1' } })
    const id = 'delivery_1'
    const timestamp = `${Math.floor(Date.now() / 1000)}`
    const secretBytes = Buffer.from('test-secret')
    const expected = createHmac('sha256', secretBytes)
      .update(`${id}.${timestamp}.${rawBody}`)
      .digest('base64')

    process.env.LUMA_WEBHOOK_SECRET = `whsec_${secretBytes.toString('base64')}`
    delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

    assert.equal(
      verifyLumaWebhookSignature(
        new Request('https://example.com/webhook', {
          headers: {
            'webhook-id': id,
            'webhook-timestamp': timestamp,
            'webhook-signature': `v1,${expected}`,
          },
        }),
        rawBody
      ),
      true
    )

    assert.equal(
      verifyLumaWebhookSignature(
        new Request('https://example.com/webhook', {
          headers: {
            'webhook-id': id,
            'webhook-timestamp': timestamp,
            'webhook-signature': 'v1,bad-signature',
          },
        }),
        rawBody
      ),
      false
    )
  } finally {
    restoreWebhookEnv()
  }
})

test('failed webhook deliveries are retried instead of acknowledged as duplicates', async () => {
  const deliveries = new Map<string, StoredDelivery>()
  const rawBody = JSON.stringify({
    type: 'event.created',
    data: {
      id: 'evt_retry',
      name: 'Retryable event',
      start_at: '2026-08-01T10:00:00.000Z',
      url: 'https://lu.ma/retryable',
    },
  })
  let shouldFail = true
  let handleCalls = 0
  const deps = createMemoryDeps(deliveries, async () => {
    handleCalls += 1
    if (shouldFail) throw new Error('temporary storage outage')
    return 'processed'
  })

  await assert.rejects(
    () => processLumaWebhookBodyWithDependencies(rawBody, deps),
    /temporary storage outage/
  )
  const [failedDelivery] = deliveries.values()
  assert.equal(failedDelivery?.status, 'failed')

  shouldFail = false
  const retried = await processLumaWebhookBodyWithDependencies(rawBody, deps)
  assert.equal(retried.duplicate, false)
  assert.equal('retried' in retried ? retried.retried : false, true)
  assert.equal(handleCalls, 2)
  const [processedDelivery] = deliveries.values()
  assert.equal(processedDelivery?.status, 'processed')

  const duplicate = await processLumaWebhookBodyWithDependencies(rawBody, deps)
  assert.equal(duplicate.duplicate, true)
  assert.equal(handleCalls, 2)
})
