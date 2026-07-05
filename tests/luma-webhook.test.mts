import test, { mock } from 'node:test'
import assert from 'node:assert/strict'

mock.module('@/db', {
  namedExports: {
    db: {},
  },
})

const {
  getLumaTicketPayloads,
  shouldRetryLumaWebhookDelivery,
} = await import('../lib/luma/webhook.ts')

test('webhook delivery retries failed and stale processing attempts only', () => {
  const now = new Date('2026-07-05T11:00:00.000Z')

  assert.equal(
    shouldRetryLumaWebhookDelivery('failed', new Date('2026-07-05T10:59:59.000Z'), now),
    true
  )
  assert.equal(
    shouldRetryLumaWebhookDelivery('processing', new Date('2026-07-05T10:54:59.000Z'), now),
    true
  )
  assert.equal(
    shouldRetryLumaWebhookDelivery('processing', new Date('2026-07-05T10:58:00.000Z'), now),
    false
  )
  assert.equal(
    shouldRetryLumaWebhookDelivery('processed', new Date('2026-07-05T10:00:00.000Z'), now),
    false
  )
  assert.equal(
    shouldRetryLumaWebhookDelivery('ignored', new Date('2026-07-05T10:00:00.000Z'), now),
    false
  )
})

test('ticket payload collection handles current and deprecated Luma fields once', () => {
  const deprecatedTicket = {
    id: 'ticket_deprecated',
    name: 'Deprecated ticket field',
  }
  const currentTicket = {
    id: 'ticket_current',
    name: 'Current ticket array field',
  }

  assert.deepEqual(
    getLumaTicketPayloads({
      event_ticket: deprecatedTicket,
      event_tickets: [deprecatedTicket, currentTicket],
    }),
    [deprecatedTicket, currentTicket]
  )
  assert.deepEqual(
    getLumaTicketPayloads({
      event_tickets: [currentTicket],
    }),
    [currentTicket]
  )
})
