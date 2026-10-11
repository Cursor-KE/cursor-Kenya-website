import type { CommunityEvent } from '@/lib/luma/types'

export function mergeLumaEventSnapshots (
  fetchedEvents: CommunityEvent[],
  authoritativeEvents: CommunityEvent[]
): CommunityEvent[] {
  const merged = new Map<string, CommunityEvent>()

  for (const event of fetchedEvents) {
    merged.set(event.id, event)
  }

  for (const event of authoritativeEvents) {
    merged.set(event.id, event)
  }

  return Array.from(merged.values()).sort((a, b) => {
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  })
}
