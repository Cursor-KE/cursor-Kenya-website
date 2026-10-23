import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SESSION_UNAUTHORIZED,
  handleCloudinarySignRequest,
} from '../lib/cloudinary/signing-handler.ts'

const configuredInput = {
  cloudName: 'demo-cloud',
  apiKey: 'demo-key',
  apiSecret: 'demo-secret',
}

test('gallery upload signing requires an approved admin session', async () => {
  let authChecks = 0

  const response = await handleCloudinarySignRequest(
    { ...configuredInput, kind: 'gallery' },
    {
      requireApprovedAdmin: async () => {
        authChecks += 1
        throw new Error(SESSION_UNAUTHORIZED)
      },
      signRequest: () => {
        throw new Error('signRequest should not be called')
      },
    }
  )

  assert.equal(authChecks, 1)
  assert.equal(response.status, 401)
  assert.deepEqual(response.body, {
    error: 'You must be signed in to upload gallery images.',
  })
})

test('missing upload kind is treated as the legacy gallery path and still requires admin', async () => {
  let authChecks = 0

  const response = await handleCloudinarySignRequest(
    { ...configuredInput, kind: null },
    {
      requireApprovedAdmin: async () => {
        authChecks += 1
        throw new Error(SESSION_UNAUTHORIZED)
      },
      signRequest: () => {
        throw new Error('signRequest should not be called')
      },
    }
  )

  assert.equal(authChecks, 1)
  assert.equal(response.status, 401)
})

test('showcase upload signing remains public for community submissions', async () => {
  let authChecks = 0

  const response = await handleCloudinarySignRequest(
    { ...configuredInput, kind: 'showcase' },
    {
      requireApprovedAdmin: async () => {
        authChecks += 1
      },
      now: () => 1_766_332_800_000,
      signRequest: (params, apiSecret) => `${apiSecret}:${params.folder}:${params.timestamp}`,
    }
  )

  assert.equal(authChecks, 0)
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, {
    cloudName: 'demo-cloud',
    apiKey: 'demo-key',
    timestamp: 1766332800,
    signature: 'demo-secret:cursor-kenya/showcase:1766332800',
    folder: 'cursor-kenya/showcase',
    kind: 'showcase',
  })
})

test('invalid upload kinds are rejected instead of falling back to gallery', async () => {
  let authChecks = 0

  const response = await handleCloudinarySignRequest(
    { ...configuredInput, kind: 'avatar' },
    {
      requireApprovedAdmin: async () => {
        authChecks += 1
      },
      signRequest: () => {
        throw new Error('signRequest should not be called')
      },
    }
  )

  assert.equal(authChecks, 0)
  assert.equal(response.status, 400)
  assert.deepEqual(response.body, {
    error: 'Upload kind must be either gallery or showcase.',
  })
})
