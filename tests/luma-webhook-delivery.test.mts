import test from 'node:test'
import assert from 'node:assert/strict'
import { isRetryableLumaWebhookDeliveryStatus } from '../lib/luma/webhook-delivery.ts'

test('failed Luma webhook deliveries are retryable so provider retries can recover writes', () => {
  assert.equal(isRetryableLumaWebhookDeliveryStatus('failed'), true)
})

test('completed or in-flight Luma webhook deliveries stay idempotent duplicates', () => {
  assert.equal(isRetryableLumaWebhookDeliveryStatus('processed'), false)
  assert.equal(isRetryableLumaWebhookDeliveryStatus('ignored'), false)
  assert.equal(isRetryableLumaWebhookDeliveryStatus('processing'), false)
})
