import { desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import {
  ArrowUpRight,
  FileText,
  ImageIcon,
  ListChecks,
  ShieldCheck,
  Video,
} from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { db } from '@/db'
import { formResponses, forms, images, user, videos } from '@/db/schema'
import { requireApprovedAdmin } from '@/lib/auth/session'

export default async function AdminDashboardPage () {
  const currentUser = await requireApprovedAdmin()

  const [statsRows, recent, pendingAdminRows] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM ${images}) AS img_c,
        (SELECT COUNT(*)::int FROM ${videos}) AS vid_c,
        (SELECT COUNT(*)::int FROM ${forms}) AS form_c,
        (SELECT COUNT(*)::int FROM ${formResponses}) AS resp_c
    `),
    db
      .select()
      .from(formResponses)
      .orderBy(desc(formResponses.createdAt))
      .limit(5),
    currentUser.user.role === 'super_user'
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(user)
          .where(eq(user.adminStatus, 'pending'))
      : Promise.resolve([{ count: 0 }]),
  ])

  const stats = statsRows[0] as {
    img_c: number
    vid_c: number
    form_c: number
    resp_c: number
  }

  const pendingAdminCount = pendingAdminRows[0]?.count ?? 0
  const metricCards = [
    {
      label: 'Images',
      value: stats?.img_c ?? 0,
      href: '/admin/gallery',
      icon: ImageIcon,
      detail: 'Published visual assets',
    },
    {
      label: 'Videos',
      value: stats?.vid_c ?? 0,
      href: '/admin/gallery',
      icon: Video,
      detail: 'Curated YouTube entries',
    },
    {
      label: 'Forms',
      value: stats?.form_c ?? 0,
      href: '/admin/forms',
      icon: FileText,
      detail: 'Active capture flows',
    },
    {
      label: 'Responses',
      value: stats?.resp_c ?? 0,
      href: '/admin/responses',
      icon: ListChecks,
      detail: 'Submission records',
    },
  ]

  return (
    <AdminPageShell
      title="Operations dashboard"
      description="A high-signal overview of content inventory, submission flow, and admin access work."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            aria-label={`${s.label}: ${Number(s.value)}. Open ${s.label} admin.`}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card
              className="relative min-h-40 border-border/70 bg-card/65 shadow-[0_18px_70px_rgb(0_0_0/0.14)] backdrop-blur transition-all duration-300 group-hover:-translate-y-0.5 group-hover:ring-primary/35"
            >
              <CardHeader className="gap-3">
                <CardAction>
                  <span className="flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-primary">
                    <s.icon />
                  </span>
                </CardAction>
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-4xl font-semibold tabular-nums tracking-tight">
                  {Number(s.value)}
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-auto flex items-end justify-between gap-3">
                <p className="text-xs leading-5 text-muted-foreground">{s.detail}</p>
                <ArrowUpRight className="text-muted-foreground transition-colors group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="border-border/70 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardAction>
              <Badge variant="outline">{recent.length} latest</Badge>
            </CardAction>
            <CardTitle>Recent responses</CardTitle>
            <CardDescription>Fresh submissions ordered by arrival time.</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/45 px-4 py-10 text-center text-sm text-muted-foreground">
                No submissions yet.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {recent.map((r, index) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/responses/${r.id}`}
                      className="group/row flex flex-col gap-3 rounded-xl border border-border/60 bg-background/45 px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-background/70 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-xs font-medium tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs text-foreground/85">
                            {r.formId.slice(0, 8)}
                          </span>
                          <span className="block text-xs text-muted-foreground">Form response</span>
                        </span>
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                        <ArrowUpRight className="transition-colors group-hover/row:text-primary" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {currentUser.user.role === 'super_user' ? (
            <Link
              href="/admin/users"
              aria-label={`Admin approvals: ${pendingAdminCount} pending. Open admin users.`}
              className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="border-primary/25 bg-primary/10 shadow-[0_24px_80px_var(--glow)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:ring-primary/35">
                <CardHeader>
                  <CardAction>
                    <ShieldCheck className="text-primary" />
                  </CardAction>
                  <CardDescription>Access control</CardDescription>
                  <CardTitle>Admin approvals</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
                    {pendingAdminCount}
                  </p>
                  <Separator />
                  <p className="text-sm leading-6 text-muted-foreground">
                    Pending admin signup{pendingAdminCount === 1 ? '' : 's'} waiting for review.
                  </p>
                </CardContent>
              </Card>
            </Link>
          ) : null}

          <Card className="border-border/70 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>System pulse</CardTitle>
              <CardDescription>Current role and content totals at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="secondary">{currentUser.user.role.replace('_', ' ')}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Content items</span>
                <span className="text-sm font-medium tabular-nums">
                  {Number(stats?.img_c ?? 0) + Number(stats?.vid_c ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Capture assets</span>
                <span className="text-sm font-medium tabular-nums">
                  {Number(stats?.form_c ?? 0) + Number(stats?.resp_c ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AdminPageShell>
  )
}
