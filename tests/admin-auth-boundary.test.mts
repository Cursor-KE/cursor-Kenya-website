import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('pending admin badge does not throw outside the admin access gate for unsigned users', () => {
  const source = readFileSync('components/admin-pending-count.tsx', 'utf8')

  assert.doesNotMatch(source, /requireApprovedAdmin/)
  assert.match(source, /getOptionalCurrentUser/)
  assert.match(source, /adminStatus !== 'approved'/)
})
