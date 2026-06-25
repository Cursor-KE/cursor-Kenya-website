import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { lumaEvents, lumaGuests, lumaTickets, lumaWebhookDeliveries } from '@/db/schema'
import { processLumaWebhookBody } from '../lib/luma/webhook.ts'

const cleanup = {
  deliveryIds: new Set<string>(),
  eventIds: new Set<string>(),
  guestIds: new Set<string>(),
  ticketIds: new Set<string>(),
}

function uniqueId (prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function deliveryIdFor (rawBody: string) {
  return createHash('sha256').update(rawBody).digest('hex')
}

function trackBody (payload: Record<string, unknown>) {
  const rawBody = JSON.stringify(payload)
  cleanup.deliveryIds.add(deliveryIdFor(rawBody))
  return rawBody
}

async function deleteWhereIn<T> (
  ids: Set<string>,
  deleteRows: (values: string[]) => Promise<T>
) {
  const values = [...ids]
  if (values.length === 0) return

  await deleteRows(values)
  ids.clear()
}

afterEach(async () => {
  await deleteWhereIn(cleanup.deliveryIds, (ids) => (
    db.delete(lumaWebhookDeliveries).where(inArray(lumaWebhookDeliveries.id, ids))
  ))
  await deleteWhereIn(cleanup.ticketIds, (ids) => (
    db.delete(lumaTickets).where(inArray(lumaTickets.id, ids))
  ))
  await deleteWhereIn(cleanup.guestIds, (ids) => (
    db.delete(lumaGuests).where(inArray(lumaGuests.id, ids))
  ))
  await deleteWhereIn(cleanup.eventIds, (ids) => (
    db.delete(lumaEvents).where(inArray(lumaEvents.id, ids))
  ))
})

test('failed Luma webhook deliveries are retried instead of deduped as successful', async () => {
  const eventId = uniqueId('evt_retry')
  cleanup.eventIds.add(eventId)

  const rawBody = trackBody({
    type: 'event.created',
    data: {
      id: eventId,
      name: 'Retryable webhook event',
      start_at: '2026-07-01T10:00:00.000Z',
      url: `https://lu.ma/${eventId}`,
    },
  })
  const deliveryId = deliveryIdFor(rawBody)

  await db.insert(lumaWebhookDeliveries).values({
    id: deliveryId,
    eventType: 'event.created',
    lumaObjectId: eventId,
    payload: JSON.parse(rawBody) as Record<string, unknown>,
    status: 'failed',
    error: 'transient database outage',
    processedAt: new Date(),
  })

  const result = await processLumaWebhookBody(rawBody)

  assert.equal(result.duplicate, false)
  assert.equal(result.retried, true)
  assert.equal(result.status, 'processed')

  const [event] = await db
    .select({ id: lumaEvents.id, title: lumaEvents.title })
    .from(lumaEvents)
    .where(eq(lumaEvents.id, eventId))
    .limit(1)
  assert.deepEqual(event, { id: eventId, title: 'Retryable webhook event' })

  const [delivery] = await db
    .select({ status: lumaWebhookDeliveries.status, error: lumaWebhookDeliveries.error })
    .from(lumaWebhookDeliveries)
    .where(eq(lumaWebhookDeliveries.id, deliveryId))
    .limit(1)
  assert.deepEqual(delivery, { status: 'processed', error: null })
})

test('ticket.registered handles event_tickets without clearing existing guest fields', async () => {
  const eventId = uniqueId('evt_ticket')
  const guestId = uniqueId('guest_ticket')
  const ticketId = uniqueId('ticket_array')
  cleanup.eventIds.add(eventId)
  cleanup.guestIds.add(guestId)
  cleanup.ticketIds.add(ticketId)

  const registeredBody = trackBody({
    type: 'guest.registered',
    data: {
      id: guestId,
      event_id: eventId,
      user_email: 'ada@example.com',
      user_name: 'Ada Lovelace',
      registered_at: '2026-07-01T09:00:00.000Z',
      event: {
        id: eventId,
        name: 'Ticket webhook event',
        start_at: '2026-07-01T10:00:00.000Z',
        url: `https://lu.ma/${eventId}`,
      },
    },
  })

  const ticketBody = trackBody({
    type: 'ticket.registered',
    data: {
      id: guestId,
      event_id: eventId,
      event_tickets: [
        {
          id: ticketId,
          event_ticket_type_id: 'type_general',
          name: 'General admission',
          amount: 0,
          currency: 'USD',
          checked_in_at: '2026-07-01T10:15:00.000Z',
        },
      ],
    },
  })

  assert.equal((await processLumaWebhookBody(registeredBody)).status, 'processed')

  const result = await processLumaWebhookBody(ticketBody)

  assert.equal(result.status, 'processed')

  const [guest] = await db
    .select({ email: lumaGuests.email, name: lumaGuests.name })
    .from(lumaGuests)
    .where(eq(lumaGuests.id, guestId))
    .limit(1)
  assert.deepEqual(guest, { email: 'ada@example.com', name: 'Ada Lovelace' })

  const [ticket] = await db
    .select({
      id: lumaTickets.id,
      guestId: lumaTickets.guestId,
      name: lumaTickets.name,
      amount: lumaTickets.amount,
      currency: lumaTickets.currency,
    })
    .from(lumaTickets)
    .where(eq(lumaTickets.id, ticketId))
    .limit(1)
  assert.deepEqual(ticket, {
    id: ticketId,
    guestId,
    name: 'General admission',
    amount: 0,
    currency: 'USD',
  })
})
