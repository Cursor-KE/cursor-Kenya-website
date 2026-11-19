import assert from 'node:assert/strict'
import test from 'node:test'
import { publicEventSnapshot, searchPublicEvents, getPublicEvent, eventSnapshotMetadata } from '../lib/webmcp/events.ts'

const raw = [
  { id: 'past', title: 'Nairobi Workshop', startAt: '2026-11-01T13:00:00Z', endAt: null, url: 'https://luma.com/past', coverUrl: 'https://image.example/past', secret: 'must-not-leak' },
  { id: 'next', title: 'Mombasa Codex Meetup', startAt: '2026-11-26T11:30:00Z', endAt: '2026-11-26T15:30:00Z', url: 'https://lu.ma/next', coverUrl: null },
  { id: 'later', title: 'Nairobi Build Night', startAt: '2026-12-01T13:00:00Z', endAt: null, url: 'https://luma.com/later', coverUrl: null },
]
const events = publicEventSnapshot(raw)
const now = Date.parse('2026-11-19T10:00:00Z')

test('projects only fields already public in event cards', () => {
  assert.deepEqual(Object.keys(events[0]).sort(), ['id', 'title', 'startAt', 'endAt', 'url'].sort())
  assert.ok(!JSON.stringify(events).includes('must-not-leak'))
})
test('disallows script, insecure, credential-bearing and offsite URLs', () => {
  for (const url of ['javascript:alert(1)', 'http://luma.com/event', 'https://luma.com.evil.test/event', 'https://user:pass@luma.com/event']) {
    assert.deepEqual(publicEventSnapshot([{ ...raw[0], url }]), [])
  }
})
test('invalid dates are not exposed', () => assert.deepEqual(publicEventSnapshot([{ ...raw[0], startAt: 'bad' }]), []))
test('upcoming default sorts chronologically', () => assert.deepEqual(searchPublicEvents(events, {}, now).events.map(e => e.id), ['next', 'later']))
test('past searches and case-insensitive title query', () => assert.deepEqual(searchPublicEvents(events, { query: 'NAIROBI', period: 'past' }, now).events.map(e => e.id), ['past']))
test('limit has truthful total and returned count', () => {
  const result = searchPublicEvents(events, { period: 'all', limit: 1 }, now)
  assert.equal(result.totalMatches, 3)
  assert.equal(result.returnedCount, 1)
})
test('invalid arguments are rejected at runtime', () => {
  for (const input of [null, [], { limit: 0 }, { limit: 1.2 }, { limit: 51 }, { period: 'yesterday' }, { period: ['upcoming'] }, { query: 7 }, { query: 'x'.repeat(201) }, { url: 'https://evil.test' }]) {
    assert.throws(() => searchPublicEvents(events, input, now))
  }
})
test('event details require exact known IDs', () => {
  assert.equal(getPublicEvent(events, { eventId: 'next' }).title, 'Mombasa Codex Meetup')
  assert.throws(() => getPublicEvent(events, { eventId: 'unknown' }))
  assert.throws(() => getPublicEvent(events, { eventId: 'next', guests: true }))
})
test('snapshot filtering does not mutate source array', () => {
  const before = JSON.stringify(events)
  searchPublicEvents(events, { period: 'past' }, now)
  assert.equal(JSON.stringify(events), before)
})
test('snapshot has explicit scope, timing and availability limitations', () => {
  const meta = eventSnapshotMetadata('homepage-upcoming-preview', '2026-11-19T10:00:00Z')
  assert.equal(meta.scope, 'homepage-upcoming-preview')
  assert.match(meta.source, /No live Luma lookup/)
  assert.match(meta.limitations, /unavailable event source/)
  assert.deepEqual(searchPublicEvents([], {}, now).events, [])
})
