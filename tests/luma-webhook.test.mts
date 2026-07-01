import test from 'node:test'
import assert from 'node:assert/strict'

process.env.DATABASE_URL ??= 'postgres://cursork:cursork@127.0.0.1:5432/cursork'

const webhook = await import('../lib/luma/webhook.ts')
const route = await import('../app/webhook/route.ts')

type StoredDeliveryStatus = 'processing' | 'processed' | 'ignored' | 'failed'
type DeliveryHandlerStatus = Exclude<StoredDeliveryStatus, 'processing'>

type DeliveryRecord = {
  status: StoredDeliveryStatus
  error?: string | null
  processedAt?: Date | null
}

const eventPayload = {
  type: 'event.created',
  data: {
    id: 'evt_retry',
    name: 'Retry Safety Test',
    start_at: '2026-07-01T12:00:00.000Z',
    url: 'https://lu.ma/retry-safety',
  },
}

function restoreWebhookAuthEnv (secret: string | undefined, token: string | undefined) {
  if (secret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = secret

  if (token === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = token
}

function createDeliveryDeps (options: {
  handlePayload: () => Promise<DeliveryHandlerStatus>
  existingStatus?: StoredDeliveryStatus
}) {
  const deliveries = new Map<string, DeliveryRecord>()
  let handleCount = 0
  let revalidateCount = 0
  let markProcessingCount = 0

  return {
    deliveries,
    get handleCount () {
      return handleCount
    },
    get revalidateCount () {
      return revalidateCount
    },
    get markProcessingCount () {
      return markProcessingCount
    },
    deps: {
      insertDelivery: async ({ id }: { id: string }) => {
        if (deliveries.has(id)) return false
        deliveries.set(id, { status: options.existingStatus ?? 'processing' })
        return options.existingStatus === undefined
      },
      getDeliveryStatus: async (deliveryId: string) => deliveries.get(deliveryId)?.status ?? null,
      markDeliveryProcessing: async (deliveryId: string) => {
        markProcessingCount += 1
        deliveries.set(deliveryId, { status: 'processing', error: null, processedAt: null })
      },
      updateDelivery: async (deliveryId: string, update: DeliveryRecord) => {
        deliveries.set(deliveryId, { ...deliveries.get(deliveryId), ...update })
      },
      handlePayload: async () => {
        handleCount += 1
        return options.handlePayload()
      },
      revalidate: () => {
        revalidateCount += 1
      },
    },
  }
}

test('webhook route rejects writes when no auth mechanism is configured', async () => {
  const originalSecret = process.env.LUMA_WEBHOOK_SECRET
  const originalToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  restoreWebhookAuthEnv(undefined, undefined)

  const response = await route.POST(
    new Request('https://example.com/webhook', {
      method: 'POST',
      body: JSON.stringify(eventPayload),
    })
  )

  assert.equal(response.status, 503)
  assert.equal(webhook.isLumaWebhookAuthConfigured(), false)

  restoreWebhookAuthEnv(originalSecret, originalToken)
})

test('failed webhook deliveries are reprocessed when Luma retries the same body', async () => {
  const rawBody = JSON.stringify(eventPayload)
  let shouldFail = true
  const store = createDeliveryDeps({
    handlePayload: async () => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('temporary database outage')
      }

      return 'processed'
    },
  })

  await assert.rejects(
    () => webhook.processLumaWebhookBodyWithDeps(rawBody, store.deps),
    /temporary database outage/
  )

  assert.equal(store.handleCount, 1)
  assert.deepEqual([...store.deliveries.values()].map((delivery) => delivery.status), ['failed'])

  const retryResult = await webhook.processLumaWebhookBodyWithDeps(rawBody, store.deps)

  assert.equal(retryResult.duplicate, false)
  assert.equal(retryResult.status, 'processed')
  assert.equal(store.handleCount, 2)
  assert.equal(store.markProcessingCount, 1)
  assert.equal(store.revalidateCount, 1)
  assert.deepEqual([...store.deliveries.values()].map((delivery) => delivery.status), ['processed'])
})

test('already processed duplicate webhook deliveries remain idempotent', async () => {
  const rawBody = JSON.stringify(eventPayload)
  const store = createDeliveryDeps({
    handlePayload: async () => 'processed',
  })

  await webhook.processLumaWebhookBodyWithDeps(rawBody, store.deps)
  const duplicateResult = await webhook.processLumaWebhookBodyWithDeps(rawBody, store.deps)

  assert.equal(duplicateResult.duplicate, true)
  assert.equal(duplicateResult.status, 'processed')
  assert.equal(store.handleCount, 1)
})

test('in-flight duplicate webhook deliveries ask Luma to retry later', async () => {
  const rawBody = JSON.stringify(eventPayload)
  const store = createDeliveryDeps({
    existingStatus: 'processing',
    handlePayload: async () => 'processed',
  })

  const result = await webhook.processLumaWebhookBodyWithDeps(rawBody, store.deps)

  assert.equal(result.duplicate, true)
  assert.equal(result.status, 'processing')
  assert.equal(result.retryable, true)
  assert.equal(store.handleCount, 0)
})
