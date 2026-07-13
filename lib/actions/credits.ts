'use server'

import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import {
  creditAuditLog,
  creditCampaignProviders,
  creditCampaigns,
  creditGuests,
  creditImports,
  creditInventory,
  creditProviders,
  lumaGuests,
} from '@/db/schema'
import { requireApprovedAdmin, requireSuperUser } from '@/lib/auth/session'
import {
  creditFingerprint,
  emailSchema,
  maskCredit,
  previewGuestCsv,
  previewInventoryCsv,
  protectCredit,
  slugSchema,
} from '@/lib/credits/core'

export type CreditActionResult = { ok: boolean; message: string }

function text (formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

function optionalDate (value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Enter a valid date and time.')
  return parsed
}

function messageFor (error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Check the submitted values.'
  if (error instanceof Error && /unique|duplicate/i.test(`${error.message} ${error.cause ?? ''}`)) return 'That record already exists.'
  return error instanceof Error ? error.message : 'Something went wrong.'
}

async function audit (actorUserId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  await db.insert(creditAuditLog).values({ id: nanoid(), actorUserId, action, entityType, entityId, metadata })
}

function refreshCredits () {
  revalidatePath('/admin/credits')
  revalidatePath('/credits', 'layout')
}

export async function createCreditProvider (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    const { user } = await requireApprovedAdmin()
    const input = z.object({ name: z.string().min(2).max(100), slug: slugSchema, description: z.string().max(1000).optional() }).parse({
      name: text(formData, 'name'), slug: text(formData, 'slug'), description: text(formData, 'description') || undefined,
    })
    const id = nanoid()
    await db.insert(creditProviders).values({ id, ...input })
    await audit(user.id, 'provider.created', 'provider', id, { name: input.name, slug: input.slug })
    refreshCredits()
    return { ok: true, message: `${input.name} is ready to use.` }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function archiveCreditProvider (formData: FormData) {
  const { user } = await requireSuperUser()
  const id = text(formData, 'id')
  await db.update(creditProviders).set({ status: 'archived', updatedAt: new Date() }).where(eq(creditProviders.id, id))
  await audit(user.id, 'provider.archived', 'provider', id)
  refreshCredits()
}

export async function createCreditCampaign (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    // Campaign creation is intentionally super-user-only. This is the authoritative boundary.
    const { user } = await requireSuperUser()
    const input = z.object({
      name: z.string().min(2).max(120), slug: slugSchema, description: z.string().max(2000).optional(),
      lumaEventId: z.string().optional(), providerId: z.string().min(1),
    }).parse({
      name: text(formData, 'name'), slug: text(formData, 'slug'), description: text(formData, 'description') || undefined,
      lumaEventId: text(formData, 'lumaEventId') || undefined, providerId: text(formData, 'providerId'),
    })
    const campaignId = nanoid()
    const allocationId = nanoid()
    await db.transaction(async (tx) => {
      await tx.insert(creditCampaigns).values({
        id: campaignId, name: input.name, slug: input.slug, description: input.description,
        lumaEventId: input.lumaEventId, createdByUserId: user.id,
      })
      await tx.insert(creditCampaignProviders).values({ id: allocationId, campaignId, providerId: input.providerId })
      await tx.insert(creditAuditLog).values({
        id: nanoid(), actorUserId: user.id, action: 'campaign.created', entityType: 'campaign', entityId: campaignId,
        metadata: { name: input.name, slug: input.slug, initialProviderId: input.providerId },
      })
    })
    refreshCredits()
    return { ok: true, message: `${input.name} was created as a draft.` }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function updateCreditCampaign (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    const { user } = await requireApprovedAdmin()
    const id = text(formData, 'id')
    const status = z.enum(['draft', 'active', 'paused', 'ended', 'archived']).parse(text(formData, 'status'))
    const claimStartsAt = optionalDate(text(formData, 'claimStartsAt'))
    const claimEndsAt = optionalDate(text(formData, 'claimEndsAt'))
    if (claimStartsAt && claimEndsAt && claimStartsAt >= claimEndsAt) throw new Error('Claim end must be after claim start.')
    await db.update(creditCampaigns).set({ status, claimStartsAt, claimEndsAt, updatedAt: new Date() }).where(eq(creditCampaigns.id, id))
    await audit(user.id, 'campaign.updated', 'campaign', id, { status, claimStartsAt, claimEndsAt })
    refreshCredits()
    return { ok: true, message: 'Campaign settings updated.' }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function addCampaignProvider (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    const { user } = await requireApprovedAdmin()
    const campaignId = text(formData, 'campaignId')
    const providerId = text(formData, 'providerId')
    const id = nanoid()
    await db.insert(creditCampaignProviders).values({
      id, campaignId, providerId, publicInstructions: text(formData, 'publicInstructions') || null,
    })
    await audit(user.id, 'campaign_provider.created', 'campaign_provider', id, { campaignId, providerId })
    refreshCredits()
    return { ok: true, message: 'Provider added to the campaign.' }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function toggleCampaignProvider (formData: FormData) {
  const { user } = await requireApprovedAdmin()
  const id = text(formData, 'id')
  const active = text(formData, 'active') === 'true'
  await db.update(creditCampaignProviders).set({ active, updatedAt: new Date() }).where(eq(creditCampaignProviders.id, id))
  await audit(user.id, active ? 'campaign_provider.resumed' : 'campaign_provider.paused', 'campaign_provider', id)
  refreshCredits()
}

export async function addCreditGuest (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    const { user } = await requireApprovedAdmin()
    const campaignId = text(formData, 'campaignId')
    const email = emailSchema.parse(text(formData, 'email'))
    const id = nanoid()
    await db.insert(creditGuests).values({
      id, campaignId, email, normalizedEmail: email, name: text(formData, 'name') || null,
      externalId: text(formData, 'externalId') || null,
    })
    await audit(user.id, 'guest.created', 'guest', id, { campaignId, normalizedEmail: email })
    refreshCredits()
    return { ok: true, message: `${email} is eligible.` }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function setCreditGuestEligibility (formData: FormData) {
  const { user } = await requireApprovedAdmin()
  const id = text(formData, 'id')
  const eligibilityStatus = z.enum(['eligible', 'removed']).parse(text(formData, 'status'))
  await db.update(creditGuests).set({ eligibilityStatus, updatedAt: new Date() }).where(eq(creditGuests.id, id))
  await audit(user.id, `guest.${eligibilityStatus}`, 'guest', id)
  refreshCredits()
}

export async function importCreditGuests (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    const { user } = await requireApprovedAdmin()
    const campaignId = text(formData, 'campaignId')
    const preview = previewGuestCsv(text(formData, 'csv'))
    let created = 0
    for (const row of preview.rows) {
      const result = await db.insert(creditGuests).values({
        id: nanoid(), campaignId, email: row.value.email, normalizedEmail: row.value.email,
        name: row.value.name, externalId: row.value.externalId, source: 'csv',
      }).onConflictDoNothing().returning({ id: creditGuests.id })
      created += result.length
    }
    const summary = { created, skipped: preview.rows.length - created, invalid: preview.errors.length, duplicates: preview.duplicates }
    const importId = nanoid()
    await db.insert(creditImports).values({ id: importId, kind: 'guests', campaignId, createdByUserId: user.id, summary })
    await audit(user.id, 'guests.imported', 'import', importId, summary)
    refreshCredits()
    return { ok: true, message: `Created ${created}; skipped ${summary.skipped}; invalid ${summary.invalid}; duplicate rows ${summary.duplicates}.` }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function importLumaCreditGuests (formData: FormData) {
  const { user } = await requireApprovedAdmin()
  const campaignId = text(formData, 'campaignId')
  const [campaign] = await db.select({ lumaEventId: creditCampaigns.lumaEventId }).from(creditCampaigns).where(eq(creditCampaigns.id, campaignId)).limit(1)
  if (!campaign?.lumaEventId) throw new Error('Map this campaign to a Luma event before importing guests.')
  const guests = await db.select().from(lumaGuests).where(eq(lumaGuests.eventId, campaign.lumaEventId))
  let created = 0
  let invalid = 0
  for (const guest of guests) {
    const parsed = emailSchema.safeParse(guest.email)
    if (!parsed.success) { invalid++; continue }
    const result = await db.insert(creditGuests).values({
      id: nanoid(), campaignId, email: parsed.data, normalizedEmail: parsed.data,
      name: guest.name, externalId: guest.id, source: 'luma',
    }).onConflictDoNothing().returning({ id: creditGuests.id })
    created += result.length
  }
  const summary = { created, skipped: guests.length - created - invalid, invalid, duplicates: guests.length - created - invalid }
  const importId = nanoid()
  await db.insert(creditImports).values({ id: importId, kind: 'luma_guests', campaignId, createdByUserId: user.id, summary })
  await audit(user.id, 'luma_guests.imported', 'import', importId, { ...summary, lumaEventId: campaign.lumaEventId })
  refreshCredits()
}

async function assertCompatibleAllocation (providerId: string, campaignProviderId: string | null) {
  if (!campaignProviderId) return
  const rows = await db.select({ providerId: creditCampaignProviders.providerId }).from(creditCampaignProviders).where(eq(creditCampaignProviders.id, campaignProviderId)).limit(1)
  if (!rows[0] || rows[0].providerId !== providerId) throw new Error('Inventory provider must match the campaign allocation provider.')
}

export async function addCreditInventory (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    const { user } = await requireApprovedAdmin()
    const providerId = text(formData, 'providerId')
    const campaignProviderId = text(formData, 'campaignProviderId') || null
    const value = text(formData, 'credit')
    if (!value) throw new Error('Credit value is required.')
    await assertCompatibleAllocation(providerId, campaignProviderId)
    const id = nanoid()
    await db.insert(creditInventory).values({
      id, providerId, campaignProviderId, fingerprint: creditFingerprint(value), encryptedValue: protectCredit(value),
      maskedValue: maskCredit(value), label: text(formData, 'label') || null,
      expiresAt: optionalDate(text(formData, 'expiresAt')), createdByUserId: user.id,
    })
    await audit(user.id, 'inventory.created', 'inventory', id, { providerId, campaignProviderId, maskedValue: maskCredit(value) })
    refreshCredits()
    return { ok: true, message: 'Credit added securely.' }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function importCreditInventory (_state: CreditActionResult, formData: FormData): Promise<CreditActionResult> {
  try {
    const { user } = await requireApprovedAdmin()
    const providerId = text(formData, 'providerId')
    const campaignProviderId = text(formData, 'campaignProviderId') || null
    await assertCompatibleAllocation(providerId, campaignProviderId)
    const preview = previewInventoryCsv(text(formData, 'csv'))
    let created = 0
    for (const row of preview.rows) {
      const result = await db.insert(creditInventory).values({
        id: nanoid(), providerId, campaignProviderId, fingerprint: creditFingerprint(row.value.credit),
        encryptedValue: protectCredit(row.value.credit), maskedValue: maskCredit(row.value.credit), label: row.value.label,
        expiresAt: row.value.expiresAt, createdByUserId: user.id,
      }).onConflictDoNothing().returning({ id: creditInventory.id })
      created += result.length
    }
    const summary = { created, skipped: preview.rows.length - created, invalid: preview.errors.length, duplicates: preview.duplicates }
    const importId = nanoid()
    await db.insert(creditImports).values({ id: importId, kind: 'inventory', providerId, campaignProviderId, createdByUserId: user.id, summary })
    await audit(user.id, 'inventory.imported', 'import', importId, summary)
    refreshCredits()
    return { ok: true, message: `Created ${created}; skipped ${summary.skipped}; invalid ${summary.invalid}; duplicate rows ${summary.duplicates}.` }
  } catch (error) { return { ok: false, message: messageFor(error) } }
}

export async function revokeCreditInventory (formData: FormData) {
  const { user } = await requireSuperUser()
  const id = text(formData, 'id')
  const reason = text(formData, 'reason')
  if (reason.length < 4) throw new Error('A revocation reason is required.')
  await db.update(creditInventory).set({ status: 'revoked', revokedAt: new Date(), updatedAt: new Date() }).where(eq(creditInventory.id, id))
  await audit(user.id, 'inventory.revoked', 'inventory', id, { reason })
  refreshCredits()
}
