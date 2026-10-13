import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canCreateCreditCampaign,
  creditFingerprint,
  isCreditCampaignClaimOpen,
  isCreditCampaignPublic,
  maskCredit,
  normalizeEmail,
  previewGuestCsv,
  previewInventoryCsv,
  protectCredit,
  revealCredit,
} from '../lib/credits/core.ts'

test('only super users can create credit campaigns', () => {
  assert.equal(canCreateCreditCampaign('super_user'), true)
  assert.equal(canCreateCreditCampaign('admin'), false)
})

test('credit campaign lifecycle controls public visibility and claim access', () => {
  const now = new Date('2026-10-13T11:00:00.000Z')
  const openCampaign = { status: 'active' as const, claimStartsAt: null, claimEndsAt: null }

  assert.equal(isCreditCampaignPublic({ status: 'draft' }), false)
  assert.equal(isCreditCampaignPublic({ status: 'active' }), true)
  assert.equal(isCreditCampaignPublic({ status: 'paused' }), true)
  assert.equal(isCreditCampaignPublic({ status: 'ended' }), true)
  assert.equal(isCreditCampaignPublic({ status: 'archived' }), false)

  assert.equal(isCreditCampaignClaimOpen(openCampaign, now), true)
  assert.equal(isCreditCampaignClaimOpen({ ...openCampaign, status: 'draft' }, now), false)
  assert.equal(isCreditCampaignClaimOpen({ ...openCampaign, status: 'paused' }, now), false)
  assert.equal(isCreditCampaignClaimOpen({ ...openCampaign, status: 'ended' }, now), false)
  assert.equal(isCreditCampaignClaimOpen({ ...openCampaign, claimStartsAt: new Date('2026-10-13T11:01:00.000Z') }, now), false)
  assert.equal(isCreditCampaignClaimOpen({ ...openCampaign, claimEndsAt: new Date('2026-10-13T10:59:00.000Z') }, now), false)
  assert.equal(isCreditCampaignClaimOpen({ ...openCampaign, claimStartsAt: now, claimEndsAt: now }, now), true)
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
