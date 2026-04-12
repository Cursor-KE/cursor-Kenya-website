import { EventsClient } from '@/app/(marketing)/events/events-client'
import { FadeIn } from '@/components/motion-fade'
import { getLumaEventsSafe } from '@/lib/luma/client'

export const revalidate = 60

export default async function EventsPage () {
  const events = await getLumaEventsSafe()

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Events</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Meetups and workshops from our Luma calendar. Toggle upcoming or past.
          </p>
        </FadeIn>
        <div className="mt-12">
          <EventsClient events={events} />
        </div>
      </div>
    </div>
  )
}
