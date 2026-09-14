import 'server-only'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { lumaEvents, lumaGuests, lumaTickets, lumaWebhookDeliveries } from '@/db/schema'
import {
  asDate,
  asInteger,
  asString,
  getEventId,
  getLumaObjectId,
  getNestedRecord,
  isRecord,
  processLumaWebhookBodyWithDeps,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
  type DeliveryStatus,
  type LumaWebhookDeliveryInput,
  type LumaWebhookEventType,
  type LumaWebhookPayload,
  type StoredDeliveryStatus,
} from '@/lib/luma/webhook-core'

function mapEventData (data: unknown, status: 'active' | 'canceled') {
  if (!isRecord(data)) return null

  const id = asString(data.id)
  const title = asString(data.name)
  const startAt = asDate(data.start_at)
  const url = asString(data.url)

  if (!id || !title || !startAt || !url) return null

  return {
    id,
    title,
    startAt,
    endAt: asDate(data.end_at),
    url,
    coverUrl: asString(data.cover_url),
    status,
    rawPayload: data,
    updatedAt: new Date(),
  }
}

async function upsertLumaEvent (data: unknown, status: 'active' | 'canceled') {
  const event = mapEventData(data, status)
  if (!event) return false

  await db
    .insert(lumaEvents)
    .values(event)
    .onConflictDoUpdate({
      target: lumaEvents.id,
      set: {
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        url: event.url,
        coverUrl: event.coverUrl,
        status: event.status,
        rawPayload: event.rawPayload,
        updatedAt: event.updatedAt,
      },
    })

  return true
}

async function upsertEmbeddedEvent (data: Record<string, unknown>) {
  const event = getNestedRecord(data, 'event')
  if (!event) return false
  return upsertLumaEvent(event, 'active')
}

function mapGuestData (data: unknown) {
  if (!isRecord(data)) return null

  const id = asString(data.id)
  const eventId = getEventId(data)
  if (!id || !eventId) return null

  return {
    id,
    eventId,
    userId: asString(data.user_id),
    email: asString(data.user_email) ?? asString(data.email),
    name: asString(data.user_name) ?? asString(data.name),
    firstName: asString(data.user_first_name),
    lastName: asString(data.user_last_name),
    approvalStatus: asString(data.approval_status),
    phoneNumber: asString(data.phone_number),
    registeredAt: asDate(data.registered_at),
    checkedInAt: asDate(data.checked_in_at) ?? asDate(data.joined_at),
    rawPayload: data,
    updatedAt: new Date(),
  }
}

async function upsertLumaGuest (data: unknown) {
  const guest = mapGuestData(data)
  if (!guest) return false

  await db
    .insert(lumaGuests)
    .values(guest)
    .onConflictDoUpdate({
      target: lumaGuests.id,
      set: {
        eventId: guest.eventId,
        userId: guest.userId,
        email: guest.email,
        name: guest.name,
        firstName: guest.firstName,
        lastName: guest.lastName,
        approvalStatus: guest.approvalStatus,
        phoneNumber: guest.phoneNumber,
        registeredAt: guest.registeredAt,
        checkedInAt: guest.checkedInAt,
        rawPayload: guest.rawPayload,
        updatedAt: guest.updatedAt,
      },
    })

  return true
}

function mapTicketData (data: Record<string, unknown>, ticketData: unknown) {
  if (!isRecord(ticketData)) return null

  const id = asString(ticketData.id)
  const eventId = getEventId(data)
  if (!id || !eventId) return null

  return {
    id,
    eventId,
    guestId: asString(data.id) ?? asString(ticketData.guest_id),
    ticketTypeId: asString(ticketData.event_ticket_type_id) ?? asString(ticketData.ticket_type_id),
    name: asString(ticketData.name),
    amount: asInteger(ticketData.amount),
    currency: asString(ticketData.currency),
    checkedInAt: asDate(ticketData.checked_in_at),
    rawPayload: ticketData,
    updatedAt: new Date(),
  }
}

async function upsertLumaTicket (data: Record<string, unknown>, ticketData: unknown) {
  const ticket = mapTicketData(data, ticketData)
  if (!ticket) return false

  await db
    .insert(lumaTickets)
    .values(ticket)
    .onConflictDoUpdate({
      target: lumaTickets.id,
      set: {
        eventId: ticket.eventId,
        guestId: ticket.guestId,
        ticketTypeId: ticket.ticketTypeId,
        name: ticket.name,
        amount: ticket.amount,
        currency: ticket.currency,
        checkedInAt: ticket.checkedInAt,
        rawPayload: ticket.rawPayload,
        updatedAt: ticket.updatedAt,
      },
    })

  return true
}

async function upsertTicketsFromGuestPayload (data: Record<string, unknown>) {
  let processed = 0
  const eventTicket = data.event_ticket
  if (await upsertLumaTicket(data, eventTicket)) processed += 1

  const eventTickets = Array.isArray(data.event_tickets) ? data.event_tickets : []
  for (const ticket of eventTickets) {
    if (await upsertLumaTicket(data, ticket)) processed += 1
  }

  return processed
}

async function syncGuestPayload (data: unknown) {
  if (!isRecord(data)) return false

  await upsertEmbeddedEvent(data)
  const guestUpdated = await upsertLumaGuest(data)
  const ticketsUpdated = await upsertTicketsFromGuestPayload(data)

  return guestUpdated || ticketsUpdated > 0
}

async function markLumaEventCanceled (payload: LumaWebhookPayload) {
  const updated = await upsertLumaEvent(payload.data, 'canceled')
  if (updated) return true

  const id = getLumaObjectId(payload)
  if (!id) return false

  await db
    .update(lumaEvents)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(eq(lumaEvents.id, id))

  return true
}

async function handleWebhookPayload (payload: LumaWebhookPayload): Promise<DeliveryStatus> {
  switch (payload.type) {
    case 'calendar.event.added':
    case 'event.created':
    case 'event.updated':
      return await upsertLumaEvent(payload.data, 'active') ? 'processed' : 'ignored'
    case 'event.canceled':
      return await markLumaEventCanceled(payload) ? 'processed' : 'ignored'
    case 'guest.registered':
    case 'guest.updated':
      return await syncGuestPayload(payload.data) ? 'processed' : 'ignored'
    case 'ticket.registered':
      if (!isRecord(payload.data)) return 'ignored'
      await upsertEmbeddedEvent(payload.data)
      await upsertLumaGuest(payload.data)
      return await upsertLumaTicket(payload.data, payload.data.event_ticket) ? 'processed' : 'ignored'
    case 'calendar.person.subscribed':
      return 'ignored'
    default:
      payload.type satisfies never
      return 'ignored'
  }
}

async function insertWebhookDelivery (delivery: LumaWebhookDeliveryInput) {
  const inserted = await db
    .insert(lumaWebhookDeliveries)
    .values(delivery)
    .onConflictDoNothing()
    .returning({ id: lumaWebhookDeliveries.id })

  return inserted.length > 0
}

async function getWebhookDelivery (deliveryId: string) {
  const rows = await db
    .select({
      status: lumaWebhookDeliveries.status,
      receivedAt: lumaWebhookDeliveries.receivedAt,
    })
    .from(lumaWebhookDeliveries)
    .where(eq(lumaWebhookDeliveries.id, deliveryId))
    .limit(1)

  const delivery = rows[0]
  if (!delivery) return null

  return {
    status: delivery.status as StoredDeliveryStatus,
    receivedAt: delivery.receivedAt,
  }
}

async function markWebhookDeliveryProcessing (deliveryId: string) {
  await db
    .update(lumaWebhookDeliveries)
    .set({
      status: 'processing',
      error: null,
      processedAt: null,
    })
    .where(eq(lumaWebhookDeliveries.id, deliveryId))
}

async function markWebhookDeliveryFinished (deliveryId: string, status: DeliveryStatus) {
  await db
    .update(lumaWebhookDeliveries)
    .set({
      status,
      error: null,
      processedAt: new Date(),
    })
    .where(eq(lumaWebhookDeliveries.id, deliveryId))
}

async function markWebhookDeliveryFailed (deliveryId: string, error: string) {
  await db
    .update(lumaWebhookDeliveries)
    .set({
      status: 'failed',
      error,
      processedAt: new Date(),
    })
    .where(eq(lumaWebhookDeliveries.id, deliveryId))
}

export async function processLumaWebhookBody (rawBody: string) {
  return processLumaWebhookBodyWithDeps(rawBody, {
    insertDelivery: insertWebhookDelivery,
    getDelivery: getWebhookDelivery,
    markDeliveryProcessing: markWebhookDeliveryProcessing,
    markDeliveryFinished: markWebhookDeliveryFinished,
    markDeliveryFailed: markWebhookDeliveryFailed,
    handlePayload: handleWebhookPayload,
    revalidate: revalidatePath,
  })
}

export { verifyLumaWebhookSignature, verifyLumaWebhookToken }
export type { LumaWebhookEventType }
