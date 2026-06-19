import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatShowcaseSubmittedAt,
  serializeCommunityShowcaseAdminRows,
} from '../lib/showcase/admin-serialization.ts'

const createdAt = new Date('2026-04-18T12:00:00.000Z')
const updatedAt = new Date('2026-04-19T12:00:00.000Z')

const row = {
  id: 'showcase_123',
  title: 'Cursor Kenya Hub',
  description: 'A community platform for events, projects, and member highlights.',
  projectUrl: 'https://example.com/demo',
  repoUrl: 'https://github.com/example/repo',
  builderName: 'Ada',
  builderEmail: 'ada@example.com',
  screenshotUrls: ['https://cdn.example.com/1.png', 'https://cdn.example.com/2.png'],
  projectKind: 'community_tool',
  status: 'pending' as const,
  featured: false,
  sortOrder: 123,
  createdAt,
  updatedAt,
}

test('showcase admin rows serialize date fields for client props', () => {
  const serializedRows = serializeCommunityShowcaseAdminRows([row])
  const serializedRow = serializedRows[0]

  assert.equal(serializedRow.createdAt, createdAt.toISOString())
  assert.equal(serializedRow.updatedAt, updatedAt.toISOString())
  assert.equal(typeof serializedRow.createdAt, 'string')
  assert.equal(typeof serializedRow.updatedAt, 'string')
})

test('showcase submitted date formatter accepts serialized dates', () => {
  assert.equal(formatShowcaseSubmittedAt(createdAt.toISOString()), 'Apr 18, 2026')
})
