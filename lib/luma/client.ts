import 'server-only'

import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { lumaEvents } from '@/db/schema'
import type { CommunityEvent } from '@/lib/luma/types'

const LUMA_BASE = 'https://public-api.luma.com'

type LumaListResponse = {
  entries?: Array<{
    event?: {
      id: string
      name: string
      start_at: string
      end_at?: string | null
      url: string
      cover_url?: string | null
    }
  }>
  has_more?: boolean
  next_cursor?: string | null
}

function getHeaders (): HeadersInit | null {
  const key = process.env.LUMA_API_KEY
  if (!key) return null
  return {
    'x-luma-api-key': key,
    Accept: 'application/json',
  }
}

function mapEntry (raw: LumaListResponse['entries'] extends (infer E)[] | undefined ? E : never): CommunityEvent | null {
  const ev = raw?.event
  if (!ev?.id || !ev.start_at) return null
  return {
    id: ev.id,
    title: ev.name ?? 'Untitled event',
    startAt: ev.start_at,
    endAt: ev.end_at ?? null,
    url: ev.url,
    coverUrl: ev.cover_url ?? null,
  }
}

async function persistFetchedEvents (events: CommunityEvent[]) {
  if (events.length === 0) return

  await db
    .insert(lumaEvents)
    .values(events.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: new Date(event.startAt),
      endAt: event.endAt ? new Date(event.endAt) : null,
      url: event.url,
      coverUrl: event.coverUrl,
      status: 'active' as const,
      rawPayload: event,
      updatedAt: new Date(),
    })))
    .onConflictDoNothing()
}

async function getCanceledLumaEventIds (eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set()

  const rows = await db
    .select({ id: lumaEvents.id })
    .from(lumaEvents)
    .where(and(
      eq(lumaEvents.status, 'canceled'),
      inArray(lumaEvents.id, eventIds)
    ))

  return new Set(rows.map((event) => event.id))
}

async function getStoredLumaEvents (): Promise<CommunityEvent[]> {
  const rows = await db
    .select()
    .from(lumaEvents)
    .where(eq(lumaEvents.status, 'active'))
    .orderBy(asc(lumaEvents.startAt))

  return rows.map((event) => ({
    id: event.id,
    title: event.title,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    url: event.url,
    coverUrl: event.coverUrl,
  }))
}

/** Fetch all events (paginated) from Luma calendar API. */
async function fetchLumaEventsFromApi (): Promise<CommunityEvent[] | null> {
  const headers = getHeaders()
  if (!headers) {
    console.warn('LUMA_API_KEY missing; skipping Luma fetch')
    return null
  }
  const out: CommunityEvent[] = []
  let cursor: string | undefined

  for (let page = 0; page < 50; page++) {
    const params = new URLSearchParams()
    params.set('sort_column', 'start_at')
    params.set('sort_direction', 'asc')
    params.set('pagination_limit', '100')
    if (cursor) params.set('pagination_cursor', cursor)

    const res = await fetch(`${LUMA_BASE}/v1/calendar/list-events?${params}`, {
      headers,
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      console.error('Luma list-events failed', res.status, await res.text())
      return null
    }

    const data = (await res.json()) as LumaListResponse
    for (const entry of data.entries ?? []) {
      const mapped = mapEntry(entry)
      if (mapped) out.push(mapped)
    }

    if (!data.has_more || !data.next_cursor) break
    cursor = data.next_cursor ?? undefined
  }

  return out
}

/** Fetch events from webhook-backed storage, falling back to Luma API before webhooks arrive. */
export async function getLumaEvents (): Promise<CommunityEvent[]> {
  let stored: CommunityEvent[] = []
  try {
    stored = await getStoredLumaEvents()
  } catch (err) {
    console.error('getStoredLumaEvents', err)
  }

  const fetched = await fetchLumaEventsFromApi()
  if (!fetched) return stored

  let activeFetched = fetched
  try {
    const canceledIds = await getCanceledLumaEventIds(fetched.map((event) => event.id))
    activeFetched = fetched.filter((event) => !canceledIds.has(event.id))
  } catch (err) {
    console.error('getCanceledLumaEventIds', err)
  }

  try {
    await persistFetchedEvents(activeFetched)
  } catch (err) {
    console.error('persistFetchedEvents', err)
  }

  return activeFetched
}

export async function getNextUpcomingEvent (): Promise<CommunityEvent | null> {
  try {
    const upcoming = await getUpcomingLumaEvents(1)
    return upcoming[0] ?? null
  } catch (err) {
    console.error('getNextUpcomingEvent', err)
    return null
  }
}

export async function getLumaEventsSafe (): Promise<CommunityEvent[]> {
  try {
    return await getLumaEvents()
  } catch (err) {
    console.error('getLumaEventsSafe', err)
    return []
  }
}

export async function getUpcomingLumaEvents (limit?: number): Promise<CommunityEvent[]> {
  const events = await getLumaEvents()
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.startAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  if (typeof limit === 'number' && limit >= 0) {
    return upcoming.slice(0, limit)
  }

  return upcoming
}
