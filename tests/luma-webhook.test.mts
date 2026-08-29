import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { lumaEvents, lumaGuests, lumaTickets, lumaWebhookDeliveries } from '../db/schema.ts'

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://cursork:cursork@127.0.0.1:5432/cursork'
process.env.DATABASE_URL = databaseUrl

function hashDelivery (rawBody: string) {
  return createHash('sha256').update(rawBody).digest('hex')
}

function buildEventPayload (id: string) {
  return {
    type: 'event.created',
    data: {
      id,
      name: 'Webhook Retry Test',
      start_at: '2026-08-15T10:00:00.000Z',
      end_at: '2026-08-15T12:00:00.000Z',
      url: 'https://lu.ma/webhook-retry-test',
      cover_url: 'https://images.example.com/retry.png',
    },
  }
}

test('webhook verification fails closed when auth env vars are missing', async () => {
  const {
    verifyLumaWebhookSignature,
    verifyLumaWebhookToken,
  } = await import('../lib/luma/webhook.ts')

  const originalRouteToken = process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  const originalSecret = process.env.LUMA_WEBHOOK_SECRET

  delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
  delete process.env.LUMA_WEBHOOK_SECRET

  try {
    assert.equal(
      verifyLumaWebhookToken(new Request('https://example.com/webhook?token=anything')),
      false
    )
    assert.equal(
      verifyLumaWebhookSignature(new Request('https://example.com/webhook'), '{}'),
      false
    )
  } finally {
    if (originalRouteToken === undefined) {
      delete process.env.LUMA_WEBHOOK_ROUTE_TOKEN
    } else {
      process.env.LUMA_WEBHOOK_ROUTE_TOKEN = originalRouteToken
    }

    if (originalSecret === undefined) {
      delete process.env.LUMA_WEBHOOK_SECRET
    } else {
      process.env.LUMA_WEBHOOK_SECRET = originalSecret
    }
  }
})

test('failed duplicate Luma deliveries are reprocessed instead of acknowledged as done', async () => {
  const { db } = await import('../db/index.ts')
  const { processLumaWebhookBody } = await import('../lib/luma/webhook.ts')
  const eventId = 'evt_test_failed_duplicate_retry'
  const payload = buildEventPayload(eventId)
  const rawBody = JSON.stringify(payload)
  const deliveryId = hashDelivery(rawBody)

  await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
  await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryId))

  await db.insert(lumaWebhookDeliveries).values({
    id: deliveryId,
    eventType: payload.type,
    lumaObjectId: eventId,
    payload,
    status: 'failed',
    error: 'transient database timeout',
    processedAt: new Date('2026-07-12T10:00:00.000Z'),
  })

  try {
    const result = await processLumaWebhookBody(rawBody)

    assert.equal(result.duplicate, true)
    assert.equal(result.retried, true)
    assert.equal(result.status, 'processed')

    const [event] = await db
      .select({ title: lumaEvents.title, status: lumaEvents.status })
      .from(lumaEvents)
      .where(eq(lumaEvents.id, eventId))
      .limit(1)

    assert.deepEqual(event, {
      title: payload.data.name,
      status: 'active',
    })

    const [delivery] = await db
      .select({
        status: lumaWebhookDeliveries.status,
        error: lumaWebhookDeliveries.error,
        processedAt: lumaWebhookDeliveries.processedAt,
      })
      .from(lumaWebhookDeliveries)
      .where(eq(lumaWebhookDeliveries.id, deliveryId))
      .limit(1)

    assert.equal(delivery.status, 'processed')
    assert.equal(delivery.error, null)
    assert.ok(delivery.processedAt instanceof Date)
  } finally {
    await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
    await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryId))
  }
})

test('processed duplicate Luma deliveries are not reprocessed', async () => {
  const { db } = await import('../db/index.ts')
  const { processLumaWebhookBody } = await import('../lib/luma/webhook.ts')
  const eventId = 'evt_test_processed_duplicate'
  const payload = buildEventPayload(eventId)
  const rawBody = JSON.stringify(payload)
  const deliveryId = hashDelivery(rawBody)

  await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
  await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryId))

  await db.insert(lumaWebhookDeliveries).values({
    id: deliveryId,
    eventType: payload.type,
    lumaObjectId: eventId,
    payload,
    status: 'processed',
    processedAt: new Date('2026-07-12T10:00:00.000Z'),
  })

  try {
    const result = await processLumaWebhookBody(rawBody)

    assert.equal(result.duplicate, true)
    assert.equal(result.status, 'processed')

    const events = await db
      .select({ id: lumaEvents.id })
      .from(lumaEvents)
      .where(eq(lumaEvents.id, eventId))
      .limit(1)

    assert.equal(events.length, 0)
  } finally {
    await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
    await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, deliveryId))
  }
})

test('sparse Luma guest updates do not erase existing nullable fields', async () => {
  const { db } = await import('../db/index.ts')
  const { processLumaWebhookBody } = await import('../lib/luma/webhook.ts')
  const eventId = 'evt_test_sparse_guest_update'
  const guestId = 'guest_test_sparse_update'
  const ticketId = 'ticket_test_sparse_update'
  const firstPayload = {
    type: 'guest.registered',
    data: {
      id: guestId,
      event_id: eventId,
      user_id: 'user_test_sparse_update',
      user_email: 'ada@example.com',
      user_name: 'Ada Lovelace',
      user_first_name: 'Ada',
      user_last_name: 'Lovelace',
      approval_status: 'approved',
      phone_number: '+254700000000',
      registered_at: '2026-08-01T10:00:00.000Z',
      event_ticket: {
        id: ticketId,
        event_ticket_type_id: 'type_test_sparse_update',
        name: 'General Admission',
        amount: 2500,
        currency: 'KES',
      },
    },
  }
  const sparsePayload = {
    type: 'guest.updated',
    data: {
      id: guestId,
      event_id: eventId,
      approval_status: 'checked_in',
      event_ticket: {
        id: ticketId,
      },
    },
  }
  const firstRawBody = JSON.stringify(firstPayload)
  const sparseRawBody = JSON.stringify(sparsePayload)
  const firstDeliveryId = hashDelivery(firstRawBody)
  const sparseDeliveryId = hashDelivery(sparseRawBody)

  await db.delete(lumaGuests).where(eq(lumaGuests.id, guestId))
  await db.delete(lumaTickets).where(eq(lumaTickets.id, ticketId))
  await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, firstDeliveryId))
  await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, sparseDeliveryId))

  try {
    await processLumaWebhookBody(firstRawBody)
    await processLumaWebhookBody(sparseRawBody)

    const [guest] = await db
      .select({
        email: lumaGuests.email,
        name: lumaGuests.name,
        approvalStatus: lumaGuests.approvalStatus,
        phoneNumber: lumaGuests.phoneNumber,
      })
      .from(lumaGuests)
      .where(eq(lumaGuests.id, guestId))
      .limit(1)

    assert.deepEqual(guest, {
      email: firstPayload.data.user_email,
      name: firstPayload.data.user_name,
      approvalStatus: sparsePayload.data.approval_status,
      phoneNumber: firstPayload.data.phone_number,
    })

    const [ticket] = await db
      .select({
        name: lumaTickets.name,
        amount: lumaTickets.amount,
        currency: lumaTickets.currency,
      })
      .from(lumaTickets)
      .where(eq(lumaTickets.id, ticketId))
      .limit(1)

    assert.deepEqual(ticket, {
      name: firstPayload.data.event_ticket.name,
      amount: firstPayload.data.event_ticket.amount,
      currency: firstPayload.data.event_ticket.currency,
    })
  } finally {
    await db.delete(lumaGuests).where(eq(lumaGuests.id, guestId))
    await db.delete(lumaTickets).where(eq(lumaTickets.id, ticketId))
    await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, firstDeliveryId))
    await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.id, sparseDeliveryId))
  }
})
