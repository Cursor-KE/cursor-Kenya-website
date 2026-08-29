import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/db'
import { creditGuests, lumaGuests } from '@/db/schema'
import { emailSchema } from '@/lib/credits/core'

type LumaCreditImportSummary = {
  created: number
  skipped: number
  invalid: number
  duplicates: number
}

type LumaCreditGuestSyncInput = {
  id: string
  approvalStatus: string | null
}

export function isLumaCreditGuestEligible (approvalStatus: string | null | undefined): boolean {
  return approvalStatus?.trim().toLowerCase() === 'approved'
}

function creditEligibilityForLumaApproval (approvalStatus: string | null): 'eligible' | 'removed' | null {
  const normalized = approvalStatus?.trim().toLowerCase()
  if (!normalized) return null
  return normalized === 'approved' ? 'eligible' : 'removed'
}

export async function syncLumaCreditGuestEligibility (guest: LumaCreditGuestSyncInput) {
  const eligibilityStatus = creditEligibilityForLumaApproval(guest.approvalStatus)
  if (!eligibilityStatus) return

  await db
    .update(creditGuests)
    .set({ eligibilityStatus, updatedAt: new Date() })
    .where(and(
      eq(creditGuests.source, 'luma'),
      eq(creditGuests.externalId, guest.id)
    ))
}

export async function importEligibleLumaCreditGuests (campaignId: string, lumaEventId: string): Promise<LumaCreditImportSummary> {
  const guests = await db.select().from(lumaGuests).where(eq(lumaGuests.eventId, lumaEventId))
  let created = 0
  let invalid = 0
  let ineligible = 0

  for (const guest of guests) {
    if (!isLumaCreditGuestEligible(guest.approvalStatus)) {
      ineligible += 1
      continue
    }

    const parsed = emailSchema.safeParse(guest.email)
    if (!parsed.success) {
      invalid += 1
      continue
    }

    const result = await db.insert(creditGuests).values({
      id: nanoid(),
      campaignId,
      email: parsed.data,
      normalizedEmail: parsed.data,
      name: guest.name,
      externalId: guest.id,
      source: 'luma',
    }).onConflictDoNothing().returning({ id: creditGuests.id })
    created += result.length
  }

  const duplicates = guests.length - created - invalid - ineligible

  return {
    created,
    skipped: ineligible + duplicates,
    invalid,
    duplicates,
  }
}
