import test from 'node:test'
import assert from 'node:assert/strict'
import {
  processLumaWebhookBodyWithDeps,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
  type DeliveryStatus,
  type ExistingLumaWebhookDelivery,
  type LumaWebhookDeliveryInput,
  type LumaWebhookPayload,
  type ProcessLumaWebhookDeps,
} from '../lib/luma/webhook-core.ts'

const originalNodeEnv = process.env.NODE_ENV
const originalWebhookSecret = process.env.LUMA_WEBHOOK_SECRET
const originalWebhookToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN

const rawEventPayload = JSON.stringify({
  type: 'event.created',
  data: {
    id: 'evt_123',
    name: 'Cursor Kenya Meetup',
    start_at: '2026-07-04T10:00:00.000Z',
    url: 'https://lu.ma/cursor-ke',
  },
})

function restoreEnv () {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
  if (originalWebhookSecret === undefined) delete process.env.LUMA_WEBHOOK_SECRET
  else process.env.LUMA_WEBHOOK_SECRET = originalWebhookSecret
  if (originalWebhookToken === undefined) delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  else process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalWebhookToken
}

function createDeps ({
  existing,
  handlePayload,
}: {
  existing: ExistingLumaWebhookDelivery | null
  handlePayload?: (payload: LumaWebhookPayload) => Promise<DeliveryStatus>
}) {
  const calls = {
    inserted: [] as LumaWebhookDeliveryInput[],
    markedProcessing: [] as string[],
    markedFinished: [] as Array<{ id: string, status: DeliveryStatus }>,
    markedFailed: [] as Array<{ id: string, error: string }>,
    handledPayloads: [] as LumaWebhookPayload[],
    revalidated: [] as string[],
  }

  const deps: ProcessLumaWebhookDeps = {
    insertDelivery: async (delivery) => {
      calls.inserted.push(delivery)
      return existing === null
    },
    getDelivery: async () => existing,
    markDeliveryProcessing: async (id) => {
      calls.markedProcessing.push(id)
    },
    markDeliveryFinished: async (id, status) => {
      calls.markedFinished.push({ id, status })
    },
    markDeliveryFailed: async (id, error) => {
      calls.markedFailed.push({ id, error })
    },
    handlePayload: async (payload) => {
      calls.handledPayloads.push(payload)
      return handlePayload ? handlePayload(payload) : 'processed'
    },
    revalidate: (path) => {
      calls.revalidated.push(path)
    },
    now: () => new Date('2026-07-03T11:00:00.000Z'),
  }

  return { calls, deps }
}

test('webhook retry reprocesses failed deliveries instead of treating them as duplicates', async () => {
  const { calls, deps } = createDeps({
    existing: {
      status: 'failed',
      receivedAt: new Date('2026-07-03T10:59:00.000Z'),
    },
  })

  const result = await processLumaWebhookBodyWithDeps(rawEventPayload, deps)

  assert.equal(result.duplicate, false)
  assert.equal(result.retried, true)
  assert.equal(result.status, 'processed')
  assert.equal(calls.markedProcessing.length, 1)
  assert.equal(calls.handledPayloads.length, 1)
  assert.equal(calls.markedFinished.length, 1)
  assert.deepEqual(calls.revalidated, ['/', '/events'])
})

test('webhook retry does not acknowledge deliveries that are still being processed', async () => {
  const { calls, deps } = createDeps({
    existing: {
      status: 'processing',
      receivedAt: new Date('2026-07-03T10:59:00.000Z'),
    },
  })

  await assert.rejects(
    () => processLumaWebhookBodyWithDeps(rawEventPayload, deps),
    /already being processed/
  )

  assert.equal(calls.handledPayloads.length, 0)
  assert.equal(calls.markedFinished.length, 0)
  assert.equal(calls.markedFailed.length, 0)
})

test('webhook idempotency still skips already processed deliveries', async () => {
  const { calls, deps } = createDeps({
    existing: {
      status: 'processed',
      receivedAt: new Date('2026-07-03T10:59:00.000Z'),
    },
  })

  const result = await processLumaWebhookBodyWithDeps(rawEventPayload, deps)

  assert.equal(result.duplicate, true)
  assert.equal(result.status, 'processed')
  assert.equal(calls.handledPayloads.length, 0)
  assert.equal(calls.markedProcessing.length, 0)
  assert.equal(calls.markedFinished.length, 0)
})

test('production webhooks are not accepted when both signature secret and route token are missing', () => {
  process.env.NODE_ENV = 'production'
  delete process.env.LUMA_WEBHOOK_SECRET
  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN

  try {
    const request = new Request('https://example.com/webhook', { method: 'POST' })

    assert.equal(verifyLumaWebhookToken(request), true)
    assert.equal(verifyLumaWebhookSignature(request, rawEventPayload), false)
  } finally {
    restoreEnv()
  }
})

test('route token can authenticate production webhooks when signature secret is not configured', () => {
  process.env.NODE_ENV = 'production'
  delete process.env.LUMA_WEBHOOK_SECRET
  process.env.LUMA_WEBHOOK_ROUTE_TOKEN = 'shared-token'

  try {
    const request = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: { 'x-webhook-token': 'shared-token' },
    })

    assert.equal(verifyLumaWebhookToken(request), true)
    assert.equal(verifyLumaWebhookSignature(request, rawEventPayload), true)
  } finally {
    restoreEnv()
  }
})
