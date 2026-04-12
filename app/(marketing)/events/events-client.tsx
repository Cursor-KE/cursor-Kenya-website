'use client'

import { useMemo, useState } from 'react'
import { EventCard } from '@/components/event-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CommunityEvent } from '@/lib/luma/types'

export function EventsClient ({ events }: { events: CommunityEvent[] }) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const now = Date.now()

  const { upcoming, past } = useMemo(() => {
    const u: CommunityEvent[] = []
    const p: CommunityEvent[] = []
    for (const e of events) {
      const t = new Date(e.startAt).getTime()
      if (t > now) u.push(e)
      else p.push(e)
    }
    u.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    p.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    return { upcoming: u, past: p }
  }, [events, now])

  const list = tab === 'upcoming' ? upcoming : past

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center backdrop-blur-sm">
        <p className="text-muted-foreground">
          No events returned. Add <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">LUMA_API_KEY</code> or
          check your Luma calendar API access.
        </p>
      </div>
    )
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'upcoming' | 'past')}>
      <TabsList className="bg-secondary/80">
        <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
        <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
      </TabsList>
      <TabsContent value={tab} className="mt-8">
        {list.length === 0 ? (
          <p className="text-center text-muted-foreground">
            {tab === 'upcoming' ? 'No upcoming events scheduled.' : 'No past events yet.'}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
