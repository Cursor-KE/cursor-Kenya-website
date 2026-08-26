import 'server-only'

import { asc, eq, sql } from 'drizzle-orm'
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
    .onConflictDoUpdate({
      target: lumaEvents.id,
      set: {
        title: sql`excluded.title`,
        startAt: sql`excluded.start_at`,
        endAt: sql`excluded.end_at`,
        url: sql`excluded.url`,
        coverUrl: sql`excluded.cover_url`,
        status: sql`excluded.status`,
        rawPayload: sql`excluded.raw_payload`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
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
async function fetchLumaEventsFromApi (): Promise<CommunityEvent[]> {
  const headers = getHeaders()
  if (!headers) {
    console.warn('LUMA_API_KEY missing; skipping Luma fetch')
    return []
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
      throw new Error(`Luma list-events failed (${res.status}): ${await res.text()}`)
    }

    const data = (await res.json()) as LumaListResponse
    for (const entry of data.entries ?? []) {
      const mapped = mapEntry(entry)
      if (mapped) out.push(mapped)
    }

    if (!data.has_more) return out
    if (!data.next_cursor) {
      throw new Error('Luma list-events returned has_more without a next_cursor')
    }
    cursor = data.next_cursor
  }

  throw new Error('Luma list-events exceeded the 50-page safety limit')
}

/** Fetch fresh Luma data first, falling back to the webhook-backed snapshot when Luma is unavailable. */
export async function getLumaEvents (): Promise<CommunityEvent[]> {
  try {
    const fetched = await fetchLumaEventsFromApi()
    if (fetched.length > 0) {
      try {
        await persistFetchedEvents(fetched)
      } catch (err) {
        console.error('persistFetchedEvents', err)
      }
      return fetched
    }
  } catch (err) {
    console.error('fetchLumaEventsFromApi', err)
  }

  try {
    return await getStoredLumaEvents()
  } catch (err) {
    console.error('getStoredLumaEvents', err)
    return []
  }
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
