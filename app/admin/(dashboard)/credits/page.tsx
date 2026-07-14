import { Suspense } from 'react'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  creditCampaignProviders,
  creditCampaigns,
  creditClaims,
  creditGuests,
  creditInventory,
  creditProviders,
  lumaEvents,
} from '@/db/schema'
import { requireApprovedAdmin } from '@/lib/auth/session'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminContentSkeleton } from '@/components/admin-page-skeleton'
import { CreditsAdminClient } from './credits-admin-client'

async function CreditsAdminContent () {
  const { user } = await requireApprovedAdmin()
  const [providers, campaigns, allocations, guests, inventory, luma, metrics, claimCounts] = await Promise.all([
    db.select().from(creditProviders).orderBy(asc(creditProviders.name)),
    db.select().from(creditCampaigns).orderBy(desc(creditCampaigns.createdAt)),
    db.select({
      id: creditCampaignProviders.id, campaignId: creditCampaignProviders.campaignId,
      providerId: creditCampaignProviders.providerId, active: creditCampaignProviders.active,
      publicInstructions: creditCampaignProviders.publicInstructions,
      campaignName: creditCampaigns.name, providerName: creditProviders.name,
    }).from(creditCampaignProviders)
      .innerJoin(creditCampaigns, eq(creditCampaignProviders.campaignId, creditCampaigns.id))
      .innerJoin(creditProviders, eq(creditCampaignProviders.providerId, creditProviders.id))
      .orderBy(asc(creditCampaigns.name), asc(creditProviders.name)),
    db.select().from(creditGuests).orderBy(desc(creditGuests.createdAt)).limit(250),
    // Deliberately exclude encryptedValue and fingerprint from routine list queries / RSC payloads.
    db.select({
      id: creditInventory.id, providerId: creditInventory.providerId,
      campaignProviderId: creditInventory.campaignProviderId, maskedValue: creditInventory.maskedValue,
      label: creditInventory.label, expiresAt: creditInventory.expiresAt, status: creditInventory.status,
      claimedAt: creditInventory.claimedAt, revokedAt: creditInventory.revokedAt,
      createdAt: creditInventory.createdAt, updatedAt: creditInventory.updatedAt,
    }).from(creditInventory).orderBy(desc(creditInventory.createdAt)).limit(250),
    db.select({ id: lumaEvents.id, title: lumaEvents.title, startAt: lumaEvents.startAt }).from(lumaEvents).orderBy(desc(lumaEvents.startAt)),
    db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM credit_inventory) AS total_inventory,
        (SELECT count(*)::int FROM credit_inventory WHERE status = 'available') AS available_inventory,
        (SELECT count(*)::int FROM credit_inventory WHERE status = 'claimed') AS claimed_inventory,
        (SELECT count(*)::int FROM credit_inventory WHERE status = 'revoked') AS revoked_inventory,
        (SELECT count(*)::int FROM credit_guests WHERE eligibility_status = 'eligible') AS eligible_guests,
        (SELECT count(*)::int FROM credit_claims) AS claims,
        (SELECT count(*)::int FROM credit_claims WHERE redeemed_at IS NOT NULL) AS redemptions
    `),
    db.select({ campaignProviderId: creditClaims.campaignProviderId, value: sql<number>`count(*)::int` })
      .from(creditClaims).groupBy(creditClaims.campaignProviderId),
  ])

  const metric = metrics[0] as Record<string, number> | undefined

  return (
    <CreditsAdminClient
      isSuperUser={user.role === 'super_user'}
      providers={providers.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }))}
      campaigns={campaigns.map((row) => ({
        ...row, claimStartsAt: row.claimStartsAt?.toISOString() ?? null, claimEndsAt: row.claimEndsAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      }))}
      allocations={allocations}
      guests={guests.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }))}
      inventory={inventory.map((row) => ({
        ...row, expiresAt: row.expiresAt?.toISOString() ?? null, claimedAt: row.claimedAt?.toISOString() ?? null,
        revokedAt: row.revokedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      }))}
      lumaEvents={luma.map((row) => ({ ...row, startAt: row.startAt.toISOString() }))}
      claimCounts={Object.fromEntries(claimCounts.map((row) => [row.campaignProviderId, row.value]))}
      metrics={{
        totalInventory: metric?.total_inventory ?? 0, availableInventory: metric?.available_inventory ?? 0,
        claimedInventory: metric?.claimed_inventory ?? 0, revokedInventory: metric?.revoked_inventory ?? 0,
        eligibleGuests: metric?.eligible_guests ?? 0, claims: metric?.claims ?? 0, redemptions: metric?.redemptions ?? 0,
      }}
    />
  )
}

export default function CreditsAdminPage () {
  return (
    <AdminPageShell
      title="Credit operations"
      description="Distribute provider credits without mixing claims, confirmed redemptions, or Luma attendance."
    >
      <Suspense fallback={<AdminContentSkeleton variant="metrics" />}>
        <CreditsAdminContent />
      </Suspense>
    </AdminPageShell>
  )
}
