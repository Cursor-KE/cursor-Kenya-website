import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SUPER_USER_AUTO_APPROVAL_ENV,
  SUPER_USER_EMAIL,
  isSuperUserEmail,
  shouldAutoApproveSuperUserSignup,
} from '../lib/auth/admin.ts'

function withEnv (env: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key])

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    fn()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('super-user email matching normalizes case and whitespace', () => {
  assert.equal(isSuperUserEmail(` ${SUPER_USER_EMAIL.toUpperCase()} `), true)
  assert.equal(isSuperUserEmail('admin@example.com'), false)
})

test('super-user signup auto-approval is disabled by default in production', () => {
  withEnv({ NODE_ENV: 'production', [SUPER_USER_AUTO_APPROVAL_ENV]: undefined }, () => {
    assert.equal(shouldAutoApproveSuperUserSignup(SUPER_USER_EMAIL), false)
  })
})

test('super-user signup auto-approval remains available in development', () => {
  withEnv({ NODE_ENV: 'development', [SUPER_USER_AUTO_APPROVAL_ENV]: undefined }, () => {
    assert.equal(shouldAutoApproveSuperUserSignup(SUPER_USER_EMAIL), true)
  })
})

test('production super-user signup auto-approval requires an explicit override', () => {
  withEnv({ NODE_ENV: 'production', [SUPER_USER_AUTO_APPROVAL_ENV]: 'true' }, () => {
    assert.equal(shouldAutoApproveSuperUserSignup(SUPER_USER_EMAIL), true)
  })
})
