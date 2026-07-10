import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LUMA_WEBHOOK_PROCESSING_RETRY_DELAY_MS,
  getLumaWebhookDuplicateAction,
} from '../lib/luma/delivery-retry.ts'

const now = new Date('2026-07-10T11:00:00.000Z')

test('completed Luma webhook duplicates are acknowledged', () => {
  assert.equal(
    getLumaWebhookDuplicateAction({
      status: 'processed',
      receivedAt: now,
    }, now),
    'acknowledge'
  )

  assert.equal(
    getLumaWebhookDuplicateAction({
      status: 'ignored',
      receivedAt: now,
    }, now),
    'acknowledge'
  )
})

test('failed Luma webhook duplicates are claimable for retry', () => {
  assert.equal(
    getLumaWebhookDuplicateAction({
      status: 'failed',
      receivedAt: now,
    }, now),
    'claim'
  )
})

test('processing Luma webhook duplicates are retried until stale', () => {
  const freshReceivedAt = new Date(now.getTime() - LUMA_WEBHOOK_PROCESSING_RETRY_DELAY_MS + 1)
  const staleReceivedAt = new Date(now.getTime() - LUMA_WEBHOOK_PROCESSING_RETRY_DELAY_MS)

  assert.equal(
    getLumaWebhookDuplicateAction({
      status: 'processing',
      receivedAt: freshReceivedAt,
    }, now),
    'retry'
  )

  assert.equal(
    getLumaWebhookDuplicateAction({
      status: 'processing',
      receivedAt: staleReceivedAt,
    }, now),
    'claim'
  )
})

test('missing Luma webhook delivery rows request another provider retry', () => {
  assert.equal(getLumaWebhookDuplicateAction(null, now), 'retry')
})
