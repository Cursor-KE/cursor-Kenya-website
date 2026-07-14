import Link from 'next/link'
import { desc, eq, gte, sql } from 'drizzle-orm'
import { Activity, ArrowUpRight, CalendarClock, CheckCircle2, Ticket, Users } from 'lucide-react'
import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { db } from '@/db'
import { lumaEvents, lumaGuests, lumaTickets, lumaWebhookDeliveries } from '@/db/schema'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function formatDateTime (value: Date | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function StatusBadge ({ status }: { status: string }) {
  const isHealthy = status === 'processed' || status === 'active' || status === 'approved'
  const isWarning = status === 'ignored' || status === 'pending_approval' || status === 'waitlist'

  return (
    <Badge
      variant={isHealthy ? 'default' : isWarning ? 'secondary' : 'destructive'}
      className="capitalize"
    >
      {status.replaceAll('_', ' ')}
    </Badge>
  )
}

function StatCard ({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: number | string
  detail: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-border/70 bg-card/60 backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-2xl font-semibold tracking-tight text-foreground">{value}</span>
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
      </CardContent>
    </Card>
  )
}

export default async function AdminEventsPage () {
  const now = new Date()

  const [
    activeEventCount,
    upcomingEventCount,
    guestCount,
    ticketCount,
    failedDeliveryCount,
    events,
    recentDeliveries,
    recentGuests,
    guestCounts,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(lumaEvents)
      .where(eq(lumaEvents.status, 'active')),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(lumaEvents)
      .where(gte(lumaEvents.startAt, now)),
    db.select({ count: sql<number>`count(*)::int` }).from(lumaGuests),
    db.select({ count: sql<number>`count(*)::int` }).from(lumaTickets),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(lumaWebhookDeliveries)
      .where(eq(lumaWebhookDeliveries.status, 'failed')),
    db.select().from(lumaEvents).orderBy(desc(lumaEvents.startAt)).limit(50),
    db
      .select()
      .from(lumaWebhookDeliveries)
      .orderBy(desc(lumaWebhookDeliveries.receivedAt))
      .limit(25),
    db.select().from(lumaGuests).orderBy(desc(lumaGuests.registeredAt)).limit(25),
    db
      .select({
        eventId: lumaGuests.eventId,
        count: sql<number>`count(*)::int`,
      })
      .from(lumaGuests)
      .groupBy(lumaGuests.eventId),
  ])

  const guestCountByEvent = new Map(guestCounts.map((row) => [row.eventId, row.count]))
  const lastDelivery = recentDeliveries[0]?.receivedAt ?? null

  return (
    <AdminPageShell
      title="Events"
      description="Monitor Luma event snapshots, webhook delivery health, and normalized guest registrations."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active events"
          value={activeEventCount[0]?.count ?? 0}
          detail="Stored from Luma"
          icon={CalendarClock}
        />
        <StatCard
          label="Upcoming"
          value={upcomingEventCount[0]?.count ?? 0}
          detail="Future start time"
          icon={Activity}
        />
        <StatCard
          label="Guests"
          value={guestCount[0]?.count ?? 0}
          detail="Synced registrations"
          icon={Users}
        />
        <StatCard
          label="Tickets"
          value={ticketCount[0]?.count ?? 0}
          detail="Synced ticket rows"
          icon={Ticket}
        />
        <StatCard
          label="Failures"
          value={failedDeliveryCount[0]?.count ?? 0}
          detail={lastDelivery ? `Last: ${formatDateTime(lastDelivery)}` : 'No deliveries yet'}
          icon={CheckCircle2}
        />
      </div>

      <Card className="border-border/70 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle>Synced Luma events</CardTitle>
          <CardDescription>Webhook-backed event snapshots used by the public site.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Luma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No Luma events synced yet.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="max-w-[360px] whitespace-normal">
                      <span className="block font-medium text-foreground">{event.title}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{event.id}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(event.startAt)}</TableCell>
                    <TableCell>{guestCountByEvent.get(event.id) ?? 0}</TableCell>
                    <TableCell>{formatDateTime(event.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <Card className="border-border/70 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Recent webhook deliveries</CardTitle>
            <CardDescription>Latest payloads accepted by `/webhook`.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No webhook deliveries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-mono text-xs">{delivery.eventType}</TableCell>
                      <TableCell>
                        <StatusBadge status={delivery.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {delivery.lumaObjectId ?? '—'}
                      </TableCell>
                      <TableCell>{formatDateTime(delivery.receivedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Recent guests</CardTitle>
            <CardDescription>Normalized guest registration stream.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {recentGuests.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-background/45 px-4 py-10 text-center text-sm text-muted-foreground">
                  No guest registrations synced yet.
                </p>
              ) : (
                recentGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/45 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-medium text-foreground">
                        {guest.name ?? guest.email ?? guest.id}
                      </span>
                      <span className="block break-all text-xs text-muted-foreground">
                        {guest.email ?? guest.id}
                      </span>
                      <span className="mt-1 block font-mono text-xs text-muted-foreground">
                        {guest.eventId}
                      </span>
                    </span>
                    <span className={cn('flex shrink-0 flex-col gap-2 sm:items-end')}>
                      {guest.approvalStatus ? <StatusBadge status={guest.approvalStatus} /> : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(guest.registeredAt)}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  )
}
