import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  creditCampaigns,
  creditGuests,
  lumaEvents,
  lumaGuests,
  lumaWebhookDeliveries,
  user,
} from '../db/schema.ts'
import { importEligibleLumaCreditGuests } from '../lib/credits/luma-sync.ts'
import { processLumaWebhookBody } from '../lib/luma/webhook.ts'

function testId (prefix: string) {
  return `${prefix}-${randomUUID()}`
}

async function seedAdminUser (id: string, email: string) {
  await db.insert(user).values({
    id,
    name: 'Test Admin',
    email,
    emailVerified: true,
    role: 'super_user',
    adminStatus: 'approved',
  })
}

async function seedLumaEvent (id: string) {
  await db.insert(lumaEvents).values({
    id,
    title: 'Credit Sync Test Event',
    startAt: new Date('2026-07-21T10:00:00Z'),
    url: `https://lu.ma/${id}`,
    rawPayload: { id },
  })
}

async function seedCreditCampaign (id: string, lumaEventId: string, createdByUserId: string) {
  await db.insert(creditCampaigns).values({
    id,
    name: 'Credit Sync Test Campaign',
    slug: id,
    lumaEventId,
    createdByUserId,
  })
}

test('Luma credit imports only create eligible guests for approved Luma RSVPs', async () => {
  const suffix = randomUUID()
  const adminId = testId('admin')
  const eventId = testId('event')
  const campaignId = testId('campaign')

  try {
    await seedAdminUser(adminId, `admin-${suffix}@example.com`)
    await seedLumaEvent(eventId)
    await seedCreditCampaign(campaignId, eventId, adminId)

    await db.insert(lumaGuests).values([
      {
        id: testId('guest-approved'),
        eventId,
        email: `approved-${suffix}@example.com`,
        name: 'Approved Guest',
        approvalStatus: 'approved',
        rawPayload: { approval_status: 'approved' },
      },
      {
        id: testId('guest-waitlist'),
        eventId,
        email: `waitlist-${suffix}@example.com`,
        name: 'Waitlisted Guest',
        approvalStatus: 'waitlist',
        rawPayload: { approval_status: 'waitlist' },
      },
      {
        id: testId('guest-pending'),
        eventId,
        email: `pending-${suffix}@example.com`,
        name: 'Pending Guest',
        approvalStatus: 'pending_approval',
        rawPayload: { approval_status: 'pending_approval' },
      },
      {
        id: testId('guest-declined'),
        eventId,
        email: `declined-${suffix}@example.com`,
        name: 'Declined Guest',
        approvalStatus: 'declined',
        rawPayload: { approval_status: 'declined' },
      },
      {
        id: testId('guest-invalid'),
        eventId,
        email: 'not-an-email',
        name: 'Invalid Guest',
        approvalStatus: 'approved',
        rawPayload: { approval_status: 'approved' },
      },
    ])

    const summary = await importEligibleLumaCreditGuests(campaignId, eventId)
    const guests = await db
      .select({
        email: creditGuests.email,
        source: creditGuests.source,
        eligibilityStatus: creditGuests.eligibilityStatus,
      })
      .from(creditGuests)
      .where(eq(creditGuests.campaignId, campaignId))

    assert.deepEqual(summary, {
      created: 1,
      skipped: 3,
      invalid: 1,
      duplicates: 0,
    })
    assert.deepEqual(guests, [{
      email: `approved-${suffix}@example.com`,
      source: 'luma',
      eligibilityStatus: 'eligible',
    }])
  } finally {
    await db.delete(creditGuests).where(eq(creditGuests.campaignId, campaignId))
    await db.delete(creditCampaigns).where(eq(creditCampaigns.id, campaignId))
    await db.delete(lumaGuests).where(eq(lumaGuests.eventId, eventId))
    await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
    await db.delete(user).where(eq(user.id, adminId))
  }
})

test('Luma guest status changes revoke and restore linked credit eligibility', async () => {
  const suffix = randomUUID()
  const adminId = testId('admin')
  const eventId = testId('event')
  const campaignId = testId('campaign')
  const lumaGuestId = testId('luma-guest')
  const creditGuestId = testId('credit-guest')

  try {
    await seedAdminUser(adminId, `admin-${suffix}@example.com`)
    await seedLumaEvent(eventId)
    await seedCreditCampaign(campaignId, eventId, adminId)
    await db.insert(creditGuests).values({
      id: creditGuestId,
      campaignId,
      email: `guest-${suffix}@example.com`,
      normalizedEmail: `guest-${suffix}@example.com`,
      externalId: lumaGuestId,
      eligibilityStatus: 'eligible',
      source: 'luma',
    })

    await processLumaWebhookBody(JSON.stringify({
      type: 'guest.updated',
      data: {
        id: lumaGuestId,
        event_id: eventId,
        user_email: `guest-${suffix}@example.com`,
        user_name: 'Downgraded Guest',
        approval_status: 'declined',
      },
    }))

    const [removedGuest] = await db
      .select({ eligibilityStatus: creditGuests.eligibilityStatus })
      .from(creditGuests)
      .where(eq(creditGuests.id, creditGuestId))

    assert.equal(removedGuest?.eligibilityStatus, 'removed')

    await processLumaWebhookBody(JSON.stringify({
      type: 'guest.updated',
      data: {
        id: lumaGuestId,
        event_id: eventId,
        user_email: `guest-${suffix}@example.com`,
        user_name: 'Restored Guest',
        approval_status: 'approved',
      },
    }))

    const [restoredGuest] = await db
      .select({ eligibilityStatus: creditGuests.eligibilityStatus })
      .from(creditGuests)
      .where(eq(creditGuests.id, creditGuestId))

    assert.equal(restoredGuest?.eligibilityStatus, 'eligible')
  } finally {
    await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.lumaObjectId, lumaGuestId))
    await db.delete(creditGuests).where(eq(creditGuests.campaignId, campaignId))
    await db.delete(creditCampaigns).where(eq(creditCampaigns.id, campaignId))
    await db.delete(lumaGuests).where(eq(lumaGuests.eventId, eventId))
    await db.delete(lumaEvents).where(eq(lumaEvents.id, eventId))
    await db.delete(user).where(eq(user.id, adminId))
  }
})
