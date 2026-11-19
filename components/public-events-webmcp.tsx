'use client'

import { useMemo } from 'react'
import { useWebMCP } from 'use-webmcp-tool'
import type { CommunityEvent } from '@/lib/luma/types'
import { eventSnapshotMetadata, getPublicEvent, publicEventSnapshot, searchPublicEvents, type EventToolScope } from '@/lib/webmcp/events'

const searchSchema = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'Case-insensitive words to match in the event title.', maxLength: 200, default: '' },
    period: { type: 'string', description: 'Filter by whether the event start time is in the future or past.', enum: ['upcoming', 'past', 'all'], default: 'upcoming' },
    limit: { type: 'integer', description: 'Maximum number of matching events to return.', minimum: 1, maximum: 50, default: 10 },
  },
  additionalProperties: false,
} as const

const detailSchema = {
  type: 'object',
  properties: { eventId: { type: 'string', description: 'The exact event ID returned by search_public_events.', minLength: 1, maxLength: 200 } },
  required: ['eventId'],
  additionalProperties: false,
} as const

/** Invisible, read-only tools. The Chrome hook handles feature detection and AbortSignal cleanup. */
export function PublicEventsWebMCP ({ events, scope, loadedAt }: { events: CommunityEvent[], scope: EventToolScope, loadedAt: string }) {
  const snapshot = useMemo(() => publicEventSnapshot(events), [events])
  const metadata = eventSnapshotMetadata(scope, loadedAt)
  const scopeDescription = scope === 'homepage-upcoming-preview'
    ? 'This homepage contains only its upcoming event preview; use the /events page for the full public calendar snapshot.'
    : 'Uses the public calendar snapshot already loaded by the events page.'

  useWebMCP({
    name: 'search_public_events',
    description: `Find SpaceXAI Kenya community events by title and time period. ${scopeDescription}`,
    inputSchema: searchSchema,
    execute: (input, { signal }) => {
      signal.throwIfAborted()
      return { ...metadata, ...searchPublicEvents(snapshot, input) }
    },
    annotations: { readOnlyHint: true, consequentialHint: false, untrustedContentHint: true },
  })

  useWebMCP({
    name: 'get_public_event',
    description: `Read a listed community event's title, dates and Luma URL. ${scopeDescription}`,
    inputSchema: detailSchema,
    execute: (input, { signal }) => {
      signal.throwIfAborted()
      return { ...metadata, event: getPublicEvent(snapshot, input) }
    },
    annotations: { readOnlyHint: true, consequentialHint: false, untrustedContentHint: true },
  })

  return null
}
