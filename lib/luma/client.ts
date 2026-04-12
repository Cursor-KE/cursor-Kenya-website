import 'server-only'

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

/** Fetch all events (paginated) from Luma calendar API */
export async function getLumaEvents (): Promise<CommunityEvent[]> {
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

export async function getNextUpcomingEvent (): Promise<CommunityEvent | null> {
  try {
    const events = await getLumaEvents()
    const now = Date.now()
    const upcoming = events
      .filter((e) => new Date(e.startAt).getTime() > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
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
