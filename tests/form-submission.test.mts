import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FormSubmissionInputError,
  MAX_FORM_SUBMISSION_BYTES,
  MAX_LONG_TEXT_ANSWER_CHARS,
  normalizeFormAnswers,
  parseFormSubmissionBody,
  readFormSubmissionJson,
} from '../lib/forms/submission.ts'
import type { FormDefinition } from '../lib/forms/types.ts'

const definition: FormDefinition = {
  blocks: [
    {
      id: 'name',
      type: 'short_text',
      label: 'Name',
      required: true,
    },
    {
      id: 'bio',
      type: 'long_text',
      label: 'Bio',
      required: false,
    },
    {
      id: 'track',
      type: 'select',
      label: 'Track',
      required: true,
      options: ['Builder', 'Investor'],
    },
  ],
}

test('form submission parser requires a slug and normalizes missing answers', () => {
  const missingSlug = parseFormSubmissionBody({ answers: {} })
  assert.equal('ok' in missingSlug, true)
  if (!('ok' in missingSlug)) return
  assert.equal(missingSlug.ok, false)

  const parsed = parseFormSubmissionBody({ slug: ' event-signup ', answers: null })
  assert.equal('ok' in parsed, false)
  if ('ok' in parsed) return
  assert.equal(parsed.slug, 'event-signup')
  assert.deepEqual(parsed.answers, {})
})

test('form answer normalization accepts declared fields only', () => {
  const result = normalizeFormAnswers(definition, {
    name: ' Ada ',
    bio: ' Builds tools ',
    track: 'Builder',
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.answers, {
    name: 'Ada',
    bio: 'Builds tools',
    track: 'Builder',
  })
})

test('form answer normalization rejects missing required and invalid select values', () => {
  const missing = normalizeFormAnswers(definition, { name: 'Ada' })
  assert.equal(missing.ok, false)
  if (missing.ok) return
  assert.equal(missing.status, 400)
  assert.match(missing.error, /Required: Track/)

  const invalidSelect = normalizeFormAnswers(definition, { name: 'Ada', track: 'Other' })
  assert.equal(invalidSelect.ok, false)
  if (invalidSelect.ok) return
  assert.equal(invalidSelect.status, 400)
  assert.match(invalidSelect.error, /valid option/)
})

test('form answer normalization rejects orphan and oversized answers', () => {
  const orphan = normalizeFormAnswers(definition, {
    name: 'Ada',
    track: 'Builder',
    attacker_field: 'persist me',
  })
  assert.equal(orphan.ok, false)
  if (orphan.ok) return
  assert.equal(orphan.status, 400)

  const oversized = normalizeFormAnswers(definition, {
    name: 'Ada',
    track: 'Builder',
    bio: 'x'.repeat(MAX_LONG_TEXT_ANSWER_CHARS + 1),
  })
  assert.equal(oversized.ok, false)
  if (oversized.ok) return
  assert.equal(oversized.status, 400)
})

test('limited JSON reader parses small payloads and rejects oversized bodies', async () => {
  const validRequest = new Request('https://example.test/api/forms/submit', {
    method: 'POST',
    body: JSON.stringify({ slug: 'event', answers: { name: 'Ada' } }),
  })
  assert.deepEqual(await readFormSubmissionJson(validRequest), {
    slug: 'event',
    answers: { name: 'Ada' },
  })

  const oversizedRequest = new Request('https://example.test/api/forms/submit', {
    method: 'POST',
    body: 'x'.repeat(MAX_FORM_SUBMISSION_BYTES + 1),
  })
  await assert.rejects(
    () => readFormSubmissionJson(oversizedRequest),
    (error) => error instanceof FormSubmissionInputError && error.status === 413
  )
})
