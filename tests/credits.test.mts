import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canCreateCreditCampaign,
  creditFingerprint,
  maskCredit,
  normalizeEmail,
  previewGuestCsv,
  previewInventoryCsv,
  protectCredit,
  revealCredit,
} from '../lib/credits/core.ts'
import { formatCreditDateTimeLocal, parseCreditDateTimeLocal } from '../lib/credits/datetime.ts'

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

test('credit claim windows round-trip as Nairobi wall time', () => {
  const parsed = parseCreditDateTimeLocal('2026-08-01T09:30')

  assert.equal(parsed?.toISOString(), '2026-08-01T06:30:00.000Z')
  assert.equal(formatCreditDateTimeLocal('2026-08-01T06:30:00.000Z'), '2026-08-01T09:30')
})

test('credit claim windows reject invalid local date-times', () => {
  assert.throws(() => parseCreditDateTimeLocal('2026-02-31T09:30'), /valid date and time/)
  assert.throws(() => parseCreditDateTimeLocal('2026-08-01'), /valid date and time/)
})
