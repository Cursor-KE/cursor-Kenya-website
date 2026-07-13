import assert from 'node:assert/strict'
import test from 'node:test'
import { recapReadingMinutes } from '../lib/recaps/display.ts'
import { normalizeRecapSlug, recapInputSchema } from '../lib/recaps/validation.ts'

test('recap slugs are normalized for public URLs', () => {
  assert.equal(normalizeRecapSlug('  Nairobi Meetup: July 2026!  '), 'nairobi-meetup-july-2026')
  assert.equal(normalizeRecapSlug('What We Built'), 'what-we-built')
})

test('recap validation falls back to the title for an empty slug', () => {
  const parsed = recapInputSchema.parse({
    title: 'Community Demo Night',
    slug: '',
    excerpt: 'A short recap from the latest Cursor Kenya demo night.',
    content: 'We shared projects, compared workflows, and documented the strongest lessons.',
    coverImageUrl: '',
    status: 'draft',
  })
  assert.equal(parsed.slug, 'community-demo-night')
  assert.equal(parsed.coverImageUrl, null)
})

test('recap validation rejects undersized or invalid posts', () => {
  const result = recapInputSchema.safeParse({
    title: 'No', slug: '', excerpt: 'Too short', content: 'Tiny', coverImageUrl: 'not-a-url', status: 'published',
  })
  assert.equal(result.success, false)
})

test('reading time always returns at least one minute', () => {
  assert.equal(recapReadingMinutes('A short note.'), 1)
  assert.equal(recapReadingMinutes(Array.from({ length: 221 }, () => 'word').join(' ')), 2)
})
