import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeLumaEventSnapshots } from '../lib/luma/snapshots.ts'

test('webhook-backed event snapshots override stale API list events', () => {
  const merged = mergeLumaEventSnapshots(
    [
      {
        id: 'evt_stale',
        title: 'Original schedule',
        startAt: '2026-08-28T13:00:00.000Z',
        endAt: '2026-08-28T16:00:00.000Z',
        url: 'https://lu.ma/original',
        coverUrl: null,
      },
    ],
    [
      {
        id: 'evt_stale',
        title: 'Updated schedule',
        startAt: '2026-08-28T16:00:00.000Z',
        endAt: '2026-08-28T18:00:00.000Z',
        url: 'https://lu.ma/updated',
        coverUrl: 'https://example.com/cover.jpg',
      },
    ]
  )

  assert.equal(merged.length, 1)
  assert.equal(merged[0]?.title, 'Updated schedule')
  assert.equal(merged[0]?.startAt, '2026-08-28T16:00:00.000Z')
  assert.equal(merged[0]?.url, 'https://lu.ma/updated')
})

test('webhook-backed events missing from the API list are preserved', () => {
  const merged = mergeLumaEventSnapshots(
    [
      {
        id: 'evt_api',
        title: 'API event',
        startAt: '2026-08-28T13:00:00.000Z',
        endAt: null,
        url: 'https://lu.ma/api',
        coverUrl: null,
      },
    ],
    [
      {
        id: 'evt_webhook',
        title: 'Webhook event',
        startAt: '2026-08-28T12:00:00.000Z',
        endAt: null,
        url: 'https://lu.ma/webhook',
        coverUrl: null,
      },
    ]
  )

  assert.deepEqual(merged.map((event) => event.id), ['evt_webhook', 'evt_api'])
})
