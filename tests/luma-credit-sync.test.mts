import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  creditCampaignProviders,
  creditCampaigns,
  creditGuests,
  creditProviders,
  lumaEvents,
  lumaGuests,
  lumaWebhookDeliveries,
  user,
} from '../db/schema.ts'
import { processLumaWebhookBody } from '../lib/luma/webhook.ts'

const ids = {
  user: 'test-luma-credit-sync-user',
  provider: 'test-luma-credit-sync-provider',
  campaign: 'test-luma-credit-sync-campaign',
  allocation: 'test-luma-credit-sync-allocation',
  event: 'test-luma-credit-sync-event',
  lumaGuest: 'test-luma-credit-sync-guest',
  creditGuest: 'test-luma-credit-sync-credit-guest',
}

async function cleanup () {
  await db.delete(lumaWebhookDeliveries).where(eq(lumaWebhookDeliveries.lumaObjectId, ids.lumaGuest))
  await db.delete(creditGuests).where(eq(creditGuests.id, ids.creditGuest))
  await db.delete(creditCampaignProviders).where(eq(creditCampaignProviders.id, ids.allocation))
  await db.delete(creditCampaigns).where(eq(creditCampaigns.id, ids.campaign))
  await db.delete(creditProviders).where(eq(creditProviders.id, ids.provider))
  await db.delete(lumaGuests).where(eq(lumaGuests.id, ids.lumaGuest))
  await db.delete(lumaEvents).where(eq(lumaEvents.id, ids.event))
  await db.delete(user).where(eq(user.id, ids.user))
}

after(cleanup)

test('Luma guest updates keep linked credit guest eligibility email current', async () => {
  await cleanup()

  await db.insert(user).values({
    id: ids.user,
    name: 'Test Admin',
    email: 'test-luma-credit-sync-admin@example.com',
    role: 'super_user',
    adminStatus: 'approved',
  })
  await db.insert(lumaEvents).values({
    id: ids.event,
    title: 'Credit Sync Event',
    startAt: new Date('2026-08-01T09:00:00.000Z'),
    url: 'https://lu.ma/test-luma-credit-sync',
    rawPayload: { id: ids.event },
  })
  await db.insert(creditProviders).values({
    id: ids.provider,
    name: 'Test Provider',
    slug: 'test-luma-credit-sync-provider',
  })
  await db.insert(creditCampaigns).values({
    id: ids.campaign,
    name: 'Credit Sync Campaign',
    slug: 'test-luma-credit-sync-campaign',
    status: 'active',
    lumaEventId: ids.event,
    createdByUserId: ids.user,
  })
  await db.insert(creditCampaignProviders).values({
    id: ids.allocation,
    campaignId: ids.campaign,
    providerId: ids.provider,
  })
  await db.insert(creditGuests).values({
    id: ids.creditGuest,
    campaignId: ids.campaign,
    email: 'old-attendee@example.com',
    normalizedEmail: 'old-attendee@example.com',
    name: 'Old Attendee',
    externalId: ids.lumaGuest,
    source: 'luma',
  })

  const rawBody = JSON.stringify({
    type: 'guest.updated',
    data: {
      id: ids.lumaGuest,
      event_id: ids.event,
      user_email: 'New-Attendee@Example.com',
      user_name: 'New Attendee',
      approval_status: 'approved',
      registered_at: '2026-07-31T08:00:00.000Z',
      event: {
        id: ids.event,
        name: 'Credit Sync Event',
        start_at: '2026-08-01T09:00:00.000Z',
        url: 'https://lu.ma/test-luma-credit-sync',
      },
    },
  })

  const result = await processLumaWebhookBody(rawBody)
  assert.equal(result.status, 'processed')

  const [guest] = await db
    .select({
      email: creditGuests.email,
      normalizedEmail: creditGuests.normalizedEmail,
      name: creditGuests.name,
    })
    .from(creditGuests)
    .where(eq(creditGuests.id, ids.creditGuest))
    .limit(1)

  assert.deepEqual(guest, {
    email: 'new-attendee@example.com',
    normalizedEmail: 'new-attendee@example.com',
    name: 'New Attendee',
  })
})
