import { BRAND } from '@/lib/brand'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { db } from '@/db'
import { creditCampaignProviders, creditCampaigns, creditProviders } from '@/db/schema'
import { CreditClaimClient } from './credit-claim-client'

export default async function CreditClaimPage ({ params }: { params: Promise<{ campaignSlug: string }> }) {
  const { campaignSlug } = await params
  const [campaign] = await db.select().from(creditCampaigns).where(eq(creditCampaigns.slug, campaignSlug)).limit(1)
  if (!campaign || campaign.status === 'archived') notFound()
  const allocations = await db.select({
    id: creditCampaignProviders.id, active: creditCampaignProviders.active,
    instructions: creditCampaignProviders.publicInstructions,
    providerName: creditProviders.name, providerSlug: creditProviders.slug,
    providerStatus: creditProviders.status,
  }).from(creditCampaignProviders)
    .innerJoin(creditProviders, eq(creditCampaignProviders.providerId, creditProviders.id))
    .where(and(eq(creditCampaignProviders.campaignId, campaign.id), eq(creditProviders.status, 'active')))

  return <main className="relative min-h-[80vh] overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,var(--glow),transparent_70%)] opacity-40" />
    <div className="relative mx-auto max-w-5xl">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{BRAND.name} credit drop</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{campaign.name}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{campaign.description || 'Verify the email used for your RSVP to securely claim an available provider credit.'}</p>
      </div>
      <CreditClaimClient
        campaignSlug={campaign.slug}
        campaignStatus={campaign.status}
        claimStartsAt={campaign.claimStartsAt?.toISOString() ?? null}
        claimEndsAt={campaign.claimEndsAt?.toISOString() ?? null}
        providers={allocations.map((allocation) => ({ name: allocation.providerName, slug: allocation.providerSlug, active: allocation.active, instructions: allocation.instructions }))}
      />
    </div>
  </main>
}
