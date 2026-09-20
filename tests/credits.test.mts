import assert from 'node:assert/strict'
import test from 'node:test'
import type { db as dbClient } from '../db/index.ts'
import type { claimCredit as claimCreditFunction } from '../lib/credits/claim-service.ts'
import { eq, sql } from 'drizzle-orm'
import {
  creditCampaignProviders,
  creditCampaigns,
  creditClaims,
  creditGuests,
  creditInventory,
  creditProviders,
  creditVerifications,
  user,
} from '../db/schema.ts'
import {
  canCreateCreditCampaign,
  creditFingerprint,
  hashVerificationValue,
  maskCredit,
  normalizeEmail,
  previewGuestCsv,
  previewInventoryCsv,
  protectCredit,
  revealCredit,
} from '../lib/credits/core.ts'

type DbClient = typeof dbClient
type ClaimCredit = typeof claimCreditFunction
type CreditClaimModules = { db: DbClient; claimCredit: ClaimCredit }
type CreditFixtureIds = {
  userId: string
  providerId: string
  campaignId: string
  campaignProviderId: string
  guestId: string
  inventoryId: string
}

let creditClaimModules: Promise<CreditClaimModules> | null = null

function loadCreditClaimModules (): Promise<CreditClaimModules> {
  if (!creditClaimModules) {
    // Import after the DATABASE_URL skip gate so non-DB test runs can still execute the pure helper tests.
    creditClaimModules = Promise.all([
      import('../db/index.ts'),
      import('../lib/credits/claim-service.ts'),
    ]).then(([dbModule, claimModule]) => ({
      db: dbModule.db,
      claimCredit: claimModule.claimCredit,
    }))
  }
  return creditClaimModules
}

function uniqueTestId (label: string): string {
  return `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function cleanupCreditFixture (db: DbClient, ids: CreditFixtureIds): Promise<void> {
  await db.delete(creditClaims).where(sql`${creditClaims.campaignProviderId} = ${ids.campaignProviderId} OR ${creditClaims.guestId} = ${ids.guestId}`)
  await db.delete(creditVerifications).where(eq(creditVerifications.campaignId, ids.campaignId))
  await db.delete(creditInventory).where(eq(creditInventory.id, ids.inventoryId))
  await db.delete(creditGuests).where(eq(creditGuests.id, ids.guestId))
  await db.delete(creditCampaignProviders).where(eq(creditCampaignProviders.id, ids.campaignProviderId))
  await db.delete(creditCampaigns).where(eq(creditCampaigns.id, ids.campaignId))
  await db.delete(creditProviders).where(eq(creditProviders.id, ids.providerId))
  await db.delete(user).where(eq(user.id, ids.userId))
}

async function insertVerification (db: DbClient, input: {
  id: string
  campaignId: string
  normalizedEmail: string
  code: string
}): Promise<void> {
  await db.insert(creditVerifications).values({
    id: input.id,
    campaignId: input.campaignId,
    normalizedEmail: input.normalizedEmail,
    codeHash: hashVerificationValue(`${input.id}:${input.code}`),
    ipHash: hashVerificationValue(`ip:${input.id}`),
    expiresAt: new Date(Date.now() + 10 * 60_000),
  })
}

async function createClaimFixture (label: string): Promise<{
  db: DbClient
  claimCredit: ClaimCredit
  ids: CreditFixtureIds
  campaignSlug: string
  providerSlug: string
  normalizedEmail: string
  code: string
  creditValue: string
  verificationId: string
}> {
  const { db, claimCredit } = await loadCreditClaimModules()
  const prefix = uniqueTestId(label)
  const ids = {
    userId: `${prefix}-user`,
    providerId: `${prefix}-provider`,
    campaignId: `${prefix}-campaign`,
    campaignProviderId: `${prefix}-allocation`,
    guestId: `${prefix}-guest`,
    inventoryId: `${prefix}-inventory`,
  }
  const campaignSlug = `${prefix}-campaign-slug`
  const providerSlug = `${prefix}-provider-slug`
  const normalizedEmail = `${prefix}@example.com`
  const code = '123456'
  const creditValue = `https://example.com/redeem/${prefix}`
  const verificationId = `${prefix}-verification`

  await cleanupCreditFixture(db, ids)
  await db.insert(user).values({
    id: ids.userId,
    name: 'Credit Test Admin',
    email: `${prefix}-admin@example.com`,
    emailVerified: true,
    role: 'super_user',
    adminStatus: 'approved',
  })
  await db.insert(creditProviders).values({
    id: ids.providerId,
    name: 'Test Provider',
    slug: providerSlug,
  })
  await db.insert(creditCampaigns).values({
    id: ids.campaignId,
    name: 'Test Campaign',
    slug: campaignSlug,
    status: 'active',
    createdByUserId: ids.userId,
  })
  await db.insert(creditCampaignProviders).values({
    id: ids.campaignProviderId,
    campaignId: ids.campaignId,
    providerId: ids.providerId,
  })
  await db.insert(creditGuests).values({
    id: ids.guestId,
    campaignId: ids.campaignId,
    email: normalizedEmail,
    normalizedEmail,
  })
  await db.insert(creditInventory).values({
    id: ids.inventoryId,
    providerId: ids.providerId,
    campaignProviderId: ids.campaignProviderId,
    fingerprint: creditFingerprint(creditValue),
    encryptedValue: protectCredit(creditValue),
    maskedValue: maskCredit(creditValue),
    createdByUserId: ids.userId,
  })
  await insertVerification(db, { id: verificationId, campaignId: ids.campaignId, normalizedEmail, code })

  return { db, claimCredit, ids, campaignSlug, providerSlug, normalizedEmail, code, creditValue, verificationId }
}

test('only super users can create credit campaigns', () => {
  assert.equal(canCreateCreditCampaign('super_user'), true)
  assert.equal(canCreateCreditCampaign('admin'), false)
})

test('guest emails are normalized and duplicate CSV rows are skipped in preview', () => {
  assert.equal(normalizeEmail('  Ada@Example.COM '), 'ada@example.com')
  const preview = previewGuestCsv('email,name\nAda@Example.COM,Ada\nada@example.com,Duplicate\ninvalid,Nope')
  assert.equal(preview.rows.length, 1)
  assert.equal(preview.rows[0]?.value.email, 'ada@example.com')
  assert.equal(preview.duplicates, 1)
  assert.equal(preview.errors.length, 1)
})

test('inventory fingerprints are stable and previews never include values in errors', () => {
  assert.equal(creditFingerprint(' code-123 '), creditFingerprint('code-123'))
  const preview = previewInventoryCsv('credit,label\nsecret-code,First\nsecret-code,Duplicate\n,Missing')
  assert.equal(preview.rows.length, 1)
  assert.equal(preview.duplicates, 1)
  assert.equal(preview.errors.length, 1)
  assert.equal(JSON.stringify(preview.errors).includes('secret-code'), false)
  assert.notEqual(maskCredit('secret-code'), 'secret-code')
})

test('credit values round-trip through configured encryption', () => {
  const previous = process.env.CREDIT_ENCRYPTION_KEY
  process.env.CREDIT_ENCRYPTION_KEY = 'test-key-do-not-use'
  try {
    const protectedValue = protectCredit('https://example.com/redeem/private')
    assert.match(protectedValue, /^v1:/)
    assert.equal(revealCredit(protectedValue), 'https://example.com/redeem/private')
  } finally {
    if (previous === undefined) delete process.env.CREDIT_ENCRYPTION_KEY
    else process.env.CREDIT_ENCRYPTION_KEY = previous
  }
})

test('claim retry returns an existing credit after the claim window ends', { skip: !process.env.DATABASE_URL }, async () => {
  const fixture = await createClaimFixture('ended-retry')
  const { db, claimCredit, ids, campaignSlug, providerSlug, normalizedEmail, code, creditValue, verificationId } = fixture
  try {
    const firstClaim = await claimCredit({ verificationId, code, campaignSlug, providerSlug })
    assert.equal(firstClaim.ok, true)
    assert.equal(firstClaim.code, 'claimed')
    assert.equal(firstClaim.credit, creditValue)

    await db.update(creditCampaigns).set({
      status: 'ended',
      claimEndsAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(),
    }).where(eq(creditCampaigns.id, ids.campaignId))
    const retryVerificationId = `${verificationId}-retry-ended`
    await insertVerification(db, { id: retryVerificationId, campaignId: ids.campaignId, normalizedEmail, code })

    const retry = await claimCredit({ verificationId: retryVerificationId, code, campaignSlug, providerSlug })
    assert.equal(retry.ok, true)
    assert.equal(retry.code, 'already_claimed')
    assert.equal(retry.credit, creditValue)
  } finally {
    await cleanupCreditFixture(db, ids)
  }
})

test('claim retry returns an existing credit after guest eligibility is removed', { skip: !process.env.DATABASE_URL }, async () => {
  const fixture = await createClaimFixture('removed-retry')
  const { db, claimCredit, ids, campaignSlug, providerSlug, normalizedEmail, code, creditValue, verificationId } = fixture
  try {
    const firstClaim = await claimCredit({ verificationId, code, campaignSlug, providerSlug })
    assert.equal(firstClaim.ok, true)
    assert.equal(firstClaim.code, 'claimed')
    assert.equal(firstClaim.credit, creditValue)

    await db.update(creditGuests).set({
      eligibilityStatus: 'removed',
      updatedAt: new Date(),
    }).where(eq(creditGuests.id, ids.guestId))
    const retryVerificationId = `${verificationId}-retry-removed`
    await insertVerification(db, { id: retryVerificationId, campaignId: ids.campaignId, normalizedEmail, code })

    const retry = await claimCredit({ verificationId: retryVerificationId, code, campaignSlug, providerSlug })
    assert.equal(retry.ok, true)
    assert.equal(retry.code, 'already_claimed')
    assert.equal(retry.credit, creditValue)
  } finally {
    await cleanupCreditFixture(db, ids)
  }
})
