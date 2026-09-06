import { BRAND } from '@/lib/brand'
import { desc, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowUpRight, CalendarClock, Gift } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/db'
import { creditCampaigns } from '@/db/schema'

export const dynamic = 'force-dynamic'

const dateFormatter = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeZone: 'Africa/Nairobi',
})

export default async function CreditsPage () {
  const campaigns = await db.select({
    id: creditCampaigns.id,
    name: creditCampaigns.name,
    slug: creditCampaigns.slug,
    description: creditCampaigns.description,
    status: creditCampaigns.status,
    claimStartsAt: creditCampaigns.claimStartsAt,
    claimEndsAt: creditCampaigns.claimEndsAt,
  }).from(creditCampaigns)
    .where(inArray(creditCampaigns.status, ['active', 'paused', 'ended']))
    .orderBy(desc(creditCampaigns.createdAt))

  const now = new Date()

  return <div className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(ellipse_55%_55%_at_50%_0%,var(--glow),transparent_72%)] opacity-40" />
    <div className="relative mx-auto max-w-6xl">
      <header className="grid gap-7 border-b border-border/80 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{BRAND.name} credit drops</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Claim tools for what you build next.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Choose your event or programme, verify the email used for your RSVP, and securely reveal an available credit.</p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_18px_var(--glow-strong)]" />
          {campaigns.length} public {campaigns.length === 1 ? 'drop' : 'drops'}
        </div>
      </header>

      {campaigns.length === 0 ? <section className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/35 px-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-background text-primary"><Gift /></span>
        <h2 className="mt-5 text-xl font-semibold">No credit drops are public yet</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">When a community credit campaign opens, you will be able to access it here.</p>
      </section> : <section aria-label="Credit campaigns" className="mt-10 grid gap-5 md:grid-cols-2">
        {campaigns.map((campaign, index) => {
          const state = getCampaignState(campaign, now)
          return <Link key={campaign.id} href={`/credits/${campaign.slug}`} className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Card className="relative h-full overflow-hidden border-border/70 bg-card/55 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:bg-card/75">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <CardHeader className="gap-5 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-5">
                  <span className="font-mono text-xs text-primary">DROP {String(index + 1).padStart(2, '0')}</span>
                  <Badge variant="outline" className={state.className}>{state.label}</Badge>
                </div>
                <CardTitle className="text-2xl tracking-tight sm:text-3xl">{campaign.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex h-[calc(100%-9rem)] flex-col px-6 pb-6 sm:px-8 sm:pb-8">
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{campaign.description || 'Verify your RSVP email to claim an available provider credit.'}</p>
                <div className="mt-auto flex items-end justify-between gap-5 pt-8">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="size-4 text-primary" />{state.detail}</p>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><ArrowUpRight className="size-4" /></span>
                </div>
              </CardContent>
            </Card>
          </Link>
        })}
      </section>}
    </div>
  </div>
}

function getCampaignState (campaign: {
  status: 'draft' | 'active' | 'paused' | 'ended' | 'archived'
  claimStartsAt: Date | null
  claimEndsAt: Date | null
}, now: Date) {
  if (campaign.status === 'paused') return {
    label: 'Paused',
    detail: 'Claims will resume soon',
    className: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  }
  if (campaign.status === 'ended' || (campaign.claimEndsAt && campaign.claimEndsAt < now)) return {
    label: 'Ended',
    detail: campaign.claimEndsAt ? `Closed ${dateFormatter.format(campaign.claimEndsAt)}` : 'Claims are closed',
    className: 'text-muted-foreground',
  }
  if (campaign.claimStartsAt && campaign.claimStartsAt > now) return {
    label: 'Upcoming',
    detail: `Opens ${dateFormatter.format(campaign.claimStartsAt)}`,
    className: 'border-sky-500/30 bg-sky-500/5 text-sky-300',
  }
  return {
    label: 'Open',
    detail: campaign.claimEndsAt ? `Closes ${dateFormatter.format(campaign.claimEndsAt)}` : 'Open while credits last',
    className: 'border-primary/30 bg-primary/5 text-primary',
  }
}
