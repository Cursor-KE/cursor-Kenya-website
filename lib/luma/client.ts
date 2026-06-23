import 'server-only'

import { asc, eq } from 'drizzle-orm'
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
      console.error('Luma list-events failed', res.status, await res.text())
      break
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
  try {
    const stored = await getStoredLumaEvents()
    if (stored.length > 0) return stored
  } catch (err) {
    console.error('getStoredLumaEvents', err)
  }

  return fetchLumaEventsFromApi()
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
