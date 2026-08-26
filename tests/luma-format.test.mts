import assert from 'node:assert/strict'
import test from 'node:test'
import { EVENT_TIME_ZONE, formatEventRange } from '../lib/luma/format.ts'

test('event ranges are always formatted in Nairobi time', () => {
  assert.equal(EVENT_TIME_ZONE, 'Africa/Nairobi')

  const range = formatEventRange(
    '2026-08-28T16:00:00.000Z',
    '2026-08-29T04:00:00.000Z'
  )

  assert.match(range, /Fri.*28 Aug.*7:00.*Sat.*29 Aug.*7:00/i)
})

test('same-day event ranges omit the repeated end date', () => {
  const range = formatEventRange(
    '2026-08-28T13:00:00.000Z',
    '2026-08-28T16:30:00.000Z'
  )

  assert.match(range, /Fri.*28 Aug.*4:00.*7:30/i)
  assert.equal((range.match(/28 Aug/gi) ?? []).length, 1)
})
