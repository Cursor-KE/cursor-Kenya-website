import type { CommunityEvent } from '@/lib/luma/types'

export type EventToolScope = 'homepage-upcoming-preview' | 'events-page'
export type PublicEvent = Pick<CommunityEvent, 'id' | 'title' | 'startAt' | 'endAt' | 'url'>

/** Explicit public projection: never spread an API or database record into tool output. */
export function publicEventSnapshot (events: CommunityEvent[]): PublicEvent[] {
  return events.flatMap((event) => {
    if (!event.id || !Number.isFinite(Date.parse(event.startAt))) return []
    let url: URL
    try { url = new URL(event.url) } catch { return [] }
    if (url.protocol !== 'https:' || !['luma.com', 'lu.ma'].includes(url.hostname) || url.username || url.password) return []
    return [{
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt && Number.isFinite(Date.parse(event.endAt)) ? event.endAt : null,
      url: url.href,
    }]
  })
}

function objectInput (value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Provide an object of tool arguments.')
  return value as Record<string, unknown>
}

export function searchPublicEvents (events: PublicEvent[], input: unknown, now = Date.now()) {
  const args = objectInput(input)
  for (const key of Object.keys(args)) if (!['query', 'period', 'limit'].includes(key)) throw new Error(`Unknown argument: ${key}`)
  const query = args.query ?? ''
  const period = args.period ?? 'upcoming'
  const limit = args.limit ?? 10
  if (typeof query !== 'string' || query.length > 200) throw new Error('query must be text, at most 200 characters.')
  if (typeof period !== 'string' || !['upcoming', 'past', 'all'].includes(period)) throw new Error('period must be upcoming, past or all.')
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('limit must be an integer from 1 to 50.')
  const needle = query.trim().toLocaleLowerCase()
  const matches = events.filter((event) => {
    const upcoming = Date.parse(event.startAt) > now
    return event.title.toLocaleLowerCase().includes(needle) && (period === 'all' || (period === 'upcoming' ? upcoming : !upcoming))
  }).sort((a, b) => period === 'past' ? Date.parse(b.startAt) - Date.parse(a.startAt) : Date.parse(a.startAt) - Date.parse(b.startAt))
  return { events: matches.slice(0, limit), totalMatches: matches.length, returnedCount: Math.min(matches.length, limit) }
}

export function getPublicEvent (events: PublicEvent[], input: unknown) {
  const args = objectInput(input)
  if (Object.keys(args).some((key) => key !== 'eventId') || typeof args.eventId !== 'string' || !args.eventId.trim() || args.eventId.length > 200) throw new Error('Provide only a nonempty eventId of at most 200 characters.')
  const event = events.find((entry) => entry.id === args.eventId)
  if (!event) throw new Error('Event not found in this page snapshot. Search the available events first, or visit /events for the calendar list.')
  return event
}

export function eventSnapshotMetadata (scope: EventToolScope, loadedAt: string) {
  return {
    scope,
    snapshotRenderedAt: loadedAt,
    calendarPage: 'https://cursorkenya.com/events',
    source: 'The same public event snapshot supplied to this page UI. No live Luma lookup is performed by these tools.',
    limitations: 'No attendee data, capacity, approval status, or registration action. Follow the event URL to verify current details. An empty snapshot may reflect an unavailable event source.',
  }
}
