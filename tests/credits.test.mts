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
  hashVerificationValue,
} from '../lib/credits/core.ts'
import { getBetterAuthSecret } from '../lib/auth/secret.ts'

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

test('production auth secret configuration fails closed', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousSecret = process.env.BETTER_AUTH_SECRET
  process.env.NODE_ENV = 'production'
  delete process.env.BETTER_AUTH_SECRET

  try {
    assert.throws(() => getBetterAuthSecret(), /BETTER_AUTH_SECRET must be set in production/)
    assert.throws(() => hashVerificationValue('verification-id:123456'), /BETTER_AUTH_SECRET must be set in production/)
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET
    else process.env.BETTER_AUTH_SECRET = previousSecret
  }
})

test('credit verification hashes use configured auth secret in production', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousSecret = process.env.BETTER_AUTH_SECRET
  process.env.NODE_ENV = 'production'
  process.env.BETTER_AUTH_SECRET = 'production-secret-used-for-test'

  try {
    const first = hashVerificationValue('verification-id:123456')
    const second = hashVerificationValue('verification-id:123456')

    assert.equal(first, second)
    assert.notEqual(first, hashVerificationValue('verification-id:654321'))
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET
    else process.env.BETTER_AUTH_SECRET = previousSecret
  }
})
