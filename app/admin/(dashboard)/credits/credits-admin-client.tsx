'use client'

import { useActionState, useState } from 'react'
import { Archive, Ban, CircleCheck, Coins, PackageOpen, Shield, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatCreditDateTimeLocal } from '@/lib/credits/datetime'
import {
  addCampaignProvider, addCreditGuest, addCreditInventory, archiveCreditProvider,
  createCreditCampaign, createCreditProvider, importCreditGuests, importCreditInventory,
  importLumaCreditGuests, revokeCreditInventory, setCreditGuestEligibility,
  toggleCampaignProvider, updateCreditCampaign, type CreditActionResult,
} from '@/lib/actions/credits'

type Provider = { id: string; name: string; slug: string; status: 'active' | 'archived'; description: string | null; createdAt: string; updatedAt: string }
type Campaign = { id: string; name: string; slug: string; description: string | null; status: 'draft' | 'active' | 'paused' | 'ended' | 'archived'; claimStartsAt: string | null; claimEndsAt: string | null; lumaEventId: string | null; createdByUserId: string; createdAt: string; updatedAt: string }
type Allocation = { id: string; campaignId: string; providerId: string; active: boolean; publicInstructions: string | null; campaignName: string; providerName: string }
type Guest = { id: string; campaignId: string; email: string; normalizedEmail: string; name: string | null; externalId: string | null; eligibilityStatus: 'eligible' | 'removed'; source: 'manual' | 'csv' | 'luma'; createdAt: string; updatedAt: string }
type Inventory = { id: string; providerId: string; campaignProviderId: string | null; maskedValue: string; label: string | null; expiresAt: string | null; status: 'available' | 'claimed' | 'revoked'; claimedAt: string | null; revokedAt: string | null; createdAt: string; updatedAt: string }
type ResultAction = (state: CreditActionResult, payload: FormData) => Promise<CreditActionResult>
const initialState: CreditActionResult = { ok: true, message: '' }

function ActionForm ({ action, children, submit = 'Save' }: { action: ResultAction; children: React.ReactNode; submit?: string }) {
  const [state, formAction, pending] = useActionState(action, initialState)
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.message ? <p role="status" className={state.ok ? 'text-sm text-emerald-400' : 'text-sm text-destructive'}>{state.message}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Working…' : submit}</Button>
    </form>
  )
}

function Field ({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>
}

function NativeSelect ({ label, name, children, defaultValue, required = true }: { label: string; name: string; children: React.ReactNode; defaultValue?: string; required?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><select id={name} name={name} defaultValue={defaultValue} required={required} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">{children}</select></div>
}

function MiniAction ({ action, fields, children, variant = 'outline' }: { action: (data: FormData) => Promise<void>; fields: Record<string, string>; children: React.ReactNode; variant?: 'outline' | 'destructive' | 'secondary' }) {
  return <form action={action}>{Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}<Button size="sm" variant={variant}>{children}</Button></form>
}

export function CreditsAdminClient ({ isSuperUser, providers, campaigns, allocations, guests, inventory, lumaEvents, metrics, claimCounts }: {
  isSuperUser: boolean; providers: Provider[]; campaigns: Campaign[]; allocations: Allocation[]; guests: Guest[]; inventory: Inventory[];
  lumaEvents: Array<{ id: string; title: string; startAt: string }>;
  metrics: { totalInventory: number; availableInventory: number; claimedInventory: number; revokedInventory: number; eligibleGuests: number; claims: number; redemptions: number };
  claimCounts: Record<string, number>;
}) {
  const activeProviders = providers.filter((provider) => provider.status === 'active')
  const defaultProvider = activeProviders.find((provider) => provider.slug === 'cursor') ?? activeProviders[0]
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '')
  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId)
  const campaignAllocations = allocations.filter((allocation) => allocation.campaignId === campaignId)
  const campaignGuests = guests.filter((guest) => guest.campaignId === campaignId)
  const metricCards = [
    ['Inventory', metrics.totalInventory, Coins], ['Available', metrics.availableInventory, PackageOpen],
    ['Eligible guests', metrics.eligibleGuests, Users], ['Claims', metrics.claims, CircleCheck],
    ['Redemptions', metrics.redemptions, Shield], ['Revoked', metrics.revokedInventory, Ban],
  ] as const

  return <>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {metricCards.map(([label, value, Icon]) => <Card key={label} className="border-border/70 bg-card/65"><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><div><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>)}
    </section>

    <Tabs defaultValue="campaigns">
      <TabsList className="h-auto flex-wrap"><TabsTrigger value="campaigns">Campaigns</TabsTrigger><TabsTrigger value="providers">Providers</TabsTrigger><TabsTrigger value="guests">Guests</TabsTrigger><TabsTrigger value="inventory">Inventory</TabsTrigger></TabsList>

      <TabsContent value="campaigns" className="mt-5 space-y-5">
        {!isSuperUser ? <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-muted-foreground"><Shield className="mr-2 inline size-4 text-primary" />Only the super admin can create a campaign. You can manage existing campaigns and their allocations.</div> : null}
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          {isSuperUser ? <Card><CardHeader><CardTitle>New campaign</CardTitle><CardDescription>Starts as a draft with Cursor selected by default.</CardDescription></CardHeader><CardContent><ActionForm action={createCreditCampaign} submit="Create campaign"><Field label="Name" name="name" required /><Field label="Slug" name="slug" placeholder="nairobi-july-credits" required /><div className="space-y-2"><Label htmlFor="campaign-description">Description</Label><Textarea id="campaign-description" name="description" /></div><NativeSelect label="Initial provider" name="providerId" defaultValue={defaultProvider?.id}>{activeProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect><NativeSelect label="Linked Luma event (optional)" name="lumaEventId" required={false}><option value="">No Luma event</option>{lumaEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</NativeSelect></ActionForm></CardContent></Card> : null}
          <Card className={!isSuperUser ? 'xl:col-span-2' : ''}><CardHeader><CardTitle>Campaign control</CardTitle><CardDescription>Campaign creation is super-admin-only; lifecycle management remains available to approved admins.</CardDescription></CardHeader><CardContent className="space-y-5"><CampaignPicker campaigns={campaigns} value={campaignId} onChange={setCampaignId} />{selectedCampaign ? <ActionForm key={selectedCampaign.id} action={updateCreditCampaign} submit="Update lifecycle"><input type="hidden" name="id" value={selectedCampaign.id} /><div className="grid gap-4 sm:grid-cols-3"><NativeSelect label="Status" name="status" defaultValue={selectedCampaign.status}>{['draft','active','paused','ended','archived'].map((status) => <option key={status} value={status}>{status}</option>)}</NativeSelect><Field label="Claims open" name="claimStartsAt" type="datetime-local" defaultValue={formatCreditDateTimeLocal(selectedCampaign.claimStartsAt)} /><Field label="Claims close" name="claimEndsAt" type="datetime-local" defaultValue={formatCreditDateTimeLocal(selectedCampaign.claimEndsAt)} /></div></ActionForm> : <p className="text-sm text-muted-foreground">No campaigns yet.</p>}</CardContent></Card>
        </div>
        {selectedCampaign ? <Card><CardHeader><CardTitle>Provider allocations</CardTitle><CardDescription>Each provider is independently pausable and has its own public instructions.</CardDescription></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="space-y-3">{campaignAllocations.map((allocation) => <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><div className="flex items-center gap-2"><p className="font-medium">{allocation.providerName}</p><Badge variant={allocation.active ? 'default' : 'secondary'}>{allocation.active ? 'active' : 'paused'}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{claimCounts[allocation.id] ?? 0} claims · {allocation.publicInstructions || 'No public instructions'}</p></div><MiniAction action={toggleCampaignProvider} fields={{ id: allocation.id, active: String(!allocation.active) }}>{allocation.active ? 'Pause' : 'Resume'}</MiniAction></div>)}</div><ActionForm action={addCampaignProvider} submit="Add provider"><input type="hidden" name="campaignId" value={selectedCampaign.id} /><NativeSelect label="Provider" name="providerId">{activeProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect><div className="space-y-2"><Label htmlFor="instructions">Public instructions</Label><Textarea id="instructions" name="publicInstructions" /></div></ActionForm></CardContent></Card> : null}
      </TabsContent>

      <TabsContent value="providers" className="mt-5"><div className="grid gap-5 xl:grid-cols-[380px_1fr]"><Card><CardHeader><CardTitle>Add provider</CardTitle><CardDescription>Cursor is seeded by default. Add Codex, DFAL, ElevenLabs, or any future provider here.</CardDescription></CardHeader><CardContent><ActionForm action={createCreditProvider} submit="Add provider"><Field label="Name" name="name" required /><Field label="Slug" name="slug" required /><div className="space-y-2"><Label htmlFor="provider-description">Description</Label><Textarea id="provider-description" name="description" /></div></ActionForm></CardContent></Card><Card><CardHeader><CardTitle>Providers</CardTitle></CardHeader><CardContent className="space-y-3">{providers.map((provider) => <div key={provider.id} className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><div className="flex items-center gap-2"><p className="font-medium">{provider.name}</p><Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>{provider.status}</Badge></div><p className="mt-1 font-mono text-xs text-muted-foreground">/{provider.slug}</p></div>{isSuperUser && provider.status === 'active' ? <MiniAction action={archiveCreditProvider} fields={{ id: provider.id }}><Archive className="size-3.5" /> Archive</MiniAction> : null}</div>)}</CardContent></Card></div></TabsContent>

      <TabsContent value="guests" className="mt-5 space-y-5"><CampaignPicker campaigns={campaigns} value={campaignId} onChange={setCampaignId} /><div className="grid gap-5 lg:grid-cols-3"><Card><CardHeader><CardTitle>Manual guest</CardTitle></CardHeader><CardContent><ActionForm action={addCreditGuest} submit="Add guest"><input type="hidden" name="campaignId" value={campaignId} /><Field label="Email" name="email" type="email" required /><Field label="Name" name="name" /><Field label="External ID" name="externalId" /></ActionForm></CardContent></Card><Card><CardHeader><CardTitle>Guest CSV</CardTitle><CardDescription>Required: email. Optional: name, external_id. Max 1 MB / 5,000 rows.</CardDescription></CardHeader><CardContent><ActionForm action={importCreditGuests} submit="Confirm import"><input type="hidden" name="campaignId" value={campaignId} /><Textarea name="csv" rows={8} placeholder={'email,name,external_id\nada@example.com,Ada,guest-1'} required /></ActionForm></CardContent></Card><Card><CardHeader><CardTitle>Luma guests</CardTitle><CardDescription>Imports only guests from the event mapped to this campaign.</CardDescription></CardHeader><CardContent><form action={importLumaCreditGuests}><input type="hidden" name="campaignId" value={campaignId} /><Button disabled={!selectedCampaign?.lumaEventId}>Import synchronized guests</Button></form></CardContent></Card></div><Card><CardHeader><CardTitle>Campaign guests</CardTitle><CardDescription>Claim state is derived from claims; eligibility is managed independently.</CardDescription></CardHeader><CardContent className="space-y-2">{campaignGuests.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No guests in this campaign.</p> : campaignGuests.map((guest) => <div key={guest.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"><div><p className="text-sm font-medium">{guest.name || guest.email}</p><p className="text-xs text-muted-foreground">{guest.email} · {guest.source}</p></div><div className="flex items-center gap-2"><Badge variant={guest.eligibilityStatus === 'eligible' ? 'default' : 'secondary'}>{guest.eligibilityStatus}</Badge><MiniAction action={setCreditGuestEligibility} fields={{ id: guest.id, status: guest.eligibilityStatus === 'eligible' ? 'removed' : 'eligible' }}>{guest.eligibilityStatus === 'eligible' ? 'Remove' : 'Restore'}</MiniAction></div></div>)}</CardContent></Card></TabsContent>

      <TabsContent value="inventory" className="mt-5 space-y-5"><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Manual inventory</CardTitle><CardDescription>Values are masked in lists and encrypted when CREDIT_ENCRYPTION_KEY is configured.</CardDescription></CardHeader><CardContent><ActionForm action={addCreditInventory} submit="Add credit"><NativeSelect label="Provider" name="providerId">{activeProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect><NativeSelect label="Campaign allocation" name="campaignProviderId" required={false}><option value="">Unallocated</option>{allocations.map((a) => <option key={a.id} value={a.id}>{a.campaignName} · {a.providerName}</option>)}</NativeSelect><Field label="Credit link or code" name="credit" required /><Field label="Label" name="label" /><Field label="Expires" name="expiresAt" type="datetime-local" /></ActionForm></CardContent></Card><Card><CardHeader><CardTitle>Inventory CSV</CardTitle><CardDescription>Required: credit. Optional: label, expires_at. Preview rules are applied before valid rows are committed.</CardDescription></CardHeader><CardContent><ActionForm action={importCreditInventory} submit="Confirm import"><NativeSelect label="Provider" name="providerId">{activeProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect><NativeSelect label="Campaign allocation" name="campaignProviderId" required={false}><option value="">Unallocated</option>{allocations.map((a) => <option key={a.id} value={a.id}>{a.campaignName} · {a.providerName}</option>)}</NativeSelect><Textarea name="csv" rows={6} placeholder={'credit,label,expires_at\nhttps://example.com/redeem/secret,July batch,2026-08-01'} required /></ActionForm></CardContent></Card></div><Card><CardHeader><CardTitle>Inventory ledger</CardTitle><CardDescription>Full credit values are never included in this list.</CardDescription></CardHeader><CardContent className="space-y-2">{inventory.map((item) => <div key={item.id} className="grid gap-3 rounded-lg border px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-mono text-sm">{item.maskedValue}</p><p className="text-xs text-muted-foreground">{item.label || 'Unlabelled'} · {providers.find((p) => p.id === item.providerId)?.name}</p></div><Badge variant={item.status === 'available' ? 'default' : 'secondary'}>{item.status}</Badge>{isSuperUser && item.status !== 'revoked' ? <form action={revokeCreditInventory} className="flex gap-2"><input type="hidden" name="id" value={item.id} /><Input name="reason" className="h-8 w-36" placeholder="Reason" required /><Button size="sm" variant="destructive">Revoke</Button></form> : null}</div>)}</CardContent></Card></TabsContent>
    </Tabs>
  </>
}

function CampaignPicker ({ campaigns, value, onChange }: { campaigns: Campaign[]; value: string; onChange: (value: string) => void }) {
  return <div className="max-w-md space-y-2"><Label htmlFor="campaign-filter">Working campaign</Label><select id="campaign-filter" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></div>
}
