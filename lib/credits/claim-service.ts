import 'server-only'

import { and, count, desc, eq, gt, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/db'
import { creditCampaigns, creditGuests, creditVerifications } from '@/db/schema'
import { sendEmail } from '@/lib/email/nodemailer'
import {
  hashVerificationValue,
  normalizeEmail,
  revealCredit,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_TTL_MINUTES,
} from '@/lib/credits/core'

export const GENERIC_VERIFICATION_MESSAGE = 'If that email is eligible, a verification code is on its way.'

function numericCode (): string {
  if (process.env.CREDIT_DEV_VERIFICATION_CODE && process.env.NODE_ENV !== 'production') {
    return process.env.CREDIT_DEV_VERIFICATION_CODE
  }
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function requestClaimVerification (input: { campaignSlug: string; email: string; ip: string }) {
  const normalizedEmail = normalizeEmail(input.email)
  const ipHash = hashVerificationValue(`ip:${input.ip}`)
  const since = new Date(Date.now() - 15 * 60_000)
  const [campaign] = await db.select({ id: creditCampaigns.id, name: creditCampaigns.name })
    .from(creditCampaigns).where(eq(creditCampaigns.slug, input.campaignSlug)).limit(1)
  if (!campaign) return { ok: true, message: GENERIC_VERIFICATION_MESSAGE }

  const [[emailRate], [ipRate]] = await Promise.all([
    db.select({ value: count() }).from(creditVerifications).where(and(
      eq(creditVerifications.campaignId, campaign.id), eq(creditVerifications.normalizedEmail, normalizedEmail), gt(creditVerifications.createdAt, since),
    )),
    db.select({ value: count() }).from(creditVerifications).where(and(eq(creditVerifications.ipHash, ipHash), gt(creditVerifications.createdAt, since))),
  ])
  if ((emailRate?.value ?? 0) >= 3 || (ipRate?.value ?? 0) >= 10) {
    return { ok: true, message: GENERIC_VERIFICATION_MESSAGE }
  }

  const code = numericCode()
  const verificationId = nanoid()
  await db.insert(creditVerifications).values({
    id: verificationId, campaignId: campaign.id, normalizedEmail,
    codeHash: hashVerificationValue(`${verificationId}:${code}`), ipHash,
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60_000),
  })

  const [eligibleGuest] = await db.select({ id: creditGuests.id }).from(creditGuests).where(and(
    eq(creditGuests.campaignId, campaign.id), eq(creditGuests.normalizedEmail, normalizedEmail), eq(creditGuests.eligibilityStatus, 'eligible'),
  )).limit(1)
  if (eligibleGuest) {
    await sendEmail({
      to: normalizedEmail,
      subject: `Your ${campaign.name} credit verification code`,
      text: `Your verification code is ${code}. It expires in ${VERIFICATION_TTL_MINUTES} minutes. If you did not request it, ignore this email.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${VERIFICATION_TTL_MINUTES} minutes. If you did not request it, ignore this email.</p>`,
    })
  }
  return { ok: true, message: GENERIC_VERIFICATION_MESSAGE, verificationId }
}

type ClaimRow = {
  campaign_id: string
  campaign_status: 'draft' | 'active' | 'paused' | 'ended' | 'archived'
  claim_starts_at: Date | null
  claim_ends_at: Date | null
  campaign_provider_id: string
  allocation_active: boolean
  provider_status: 'active' | 'archived'
  guest_id: string
}

type InventoryRow = { id: string; encrypted_value: string }

export async function claimCredit (input: { verificationId: string; code: string; campaignSlug: string; providerSlug: string }) {
  const [verification] = await db.select().from(creditVerifications)
    .where(eq(creditVerifications.id, input.verificationId)).orderBy(desc(creditVerifications.createdAt)).limit(1)
  if (!verification || verification.expiresAt <= new Date()) return { ok: false, code: 'invalid_verification', message: 'That verification code is invalid or expired.' }
  if (verification.attempts >= VERIFICATION_MAX_ATTEMPTS) return { ok: false, code: 'too_many_attempts', message: 'Too many attempts. Request a new code.' }
  const matches = hashVerificationValue(`${verification.id}:${input.code.trim()}`) === verification.codeHash
  if (!matches) {
    await db.update(creditVerifications).set({ attempts: sql`${creditVerifications.attempts} + 1` }).where(eq(creditVerifications.id, verification.id))
    return { ok: false, code: 'invalid_verification', message: 'That verification code is invalid or expired.' }
  }
  await db.update(creditVerifications).set({ verifiedAt: new Date() }).where(eq(creditVerifications.id, verification.id))

  try {
    return await db.transaction(async (tx) => {
      const access = await tx.execute(sql`
        SELECT c.id AS campaign_id, c.status AS campaign_status, c.claim_starts_at, c.claim_ends_at,
               cp.id AS campaign_provider_id, cp.active AS allocation_active,
               p.status AS provider_status, g.id AS guest_id
        FROM credit_campaigns c
        JOIN credit_campaign_providers cp ON cp.campaign_id = c.id
        JOIN credit_providers p ON p.id = cp.provider_id
        JOIN credit_guests g ON g.campaign_id = c.id
        WHERE c.id = ${verification.campaignId} AND c.slug = ${input.campaignSlug} AND p.slug = ${input.providerSlug}
          AND g.normalized_email = ${verification.normalizedEmail}
          AND g.eligibility_status = 'eligible'
        LIMIT 1
        FOR UPDATE OF g
      `) as unknown as ClaimRow[]
      const row = access[0]
      if (!row) return { ok: false, code: 'not_eligible', message: 'No available credit could be claimed for this email.' }
      const now = new Date()
      if (row.campaign_status !== 'active' || !row.allocation_active || row.provider_status !== 'active') {
        return { ok: false, code: 'not_active', message: 'This credit campaign is not currently accepting claims.' }
      }
      if (row.claim_starts_at && row.claim_starts_at > now) return { ok: false, code: 'not_started', message: 'Claims have not opened yet.' }
      if (row.claim_ends_at && row.claim_ends_at < now) return { ok: false, code: 'ended', message: 'The claim window has ended.' }

      const existing = await tx.execute(sql`
        SELECT i.encrypted_value FROM credit_claims cl
        JOIN credit_inventory i ON i.id = cl.inventory_id
        WHERE cl.campaign_provider_id = ${row.campaign_provider_id} AND cl.guest_id = ${row.guest_id}
        LIMIT 1
      `) as unknown as InventoryRow[]
      if (existing[0]) return { ok: true, code: 'already_claimed', credit: revealCredit(existing[0].encrypted_value), message: 'Here is your previously claimed credit.' }

      const available = await tx.execute(sql`
        SELECT id, encrypted_value FROM credit_inventory
        WHERE campaign_provider_id = ${row.campaign_provider_id} AND status = 'available'
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
      `) as unknown as InventoryRow[]
      const inventory = available[0]
      if (!inventory) return { ok: false, code: 'out_of_stock', message: 'Credits are currently out of stock. Please check back later.' }

      const claimedAt = new Date()
      await tx.execute(sql`INSERT INTO credit_claims (id, campaign_provider_id, guest_id, inventory_id, claimed_at)
        VALUES (${nanoid()}, ${row.campaign_provider_id}, ${row.guest_id}, ${inventory.id}, ${claimedAt})`)
      await tx.execute(sql`UPDATE credit_inventory SET status = 'claimed', claimed_at = ${claimedAt}, updated_at = ${claimedAt} WHERE id = ${inventory.id}`)
      return { ok: true, code: 'claimed', credit: revealCredit(inventory.encrypted_value), message: 'Credit claimed successfully.' }
    })
  } catch (error) {
    if (/unique|duplicate/i.test(error instanceof Error ? error.message : String(error))) {
      const existing = await db.execute(sql`
        SELECT i.encrypted_value FROM credit_claims cl
        JOIN credit_inventory i ON i.id = cl.inventory_id
        JOIN credit_campaign_providers cp ON cp.id = cl.campaign_provider_id
        JOIN credit_campaigns c ON c.id = cp.campaign_id
        JOIN credit_providers p ON p.id = cp.provider_id
        JOIN credit_guests g ON g.id = cl.guest_id
        WHERE c.id = ${verification.campaignId} AND c.slug = ${input.campaignSlug} AND p.slug = ${input.providerSlug}
          AND g.normalized_email = ${verification.normalizedEmail} LIMIT 1
      `) as unknown as InventoryRow[]
      if (existing[0]) return { ok: true, code: 'already_claimed', credit: revealCredit(existing[0].encrypted_value), message: 'Here is your previously claimed credit.' }
    }
    throw error
  }
}
