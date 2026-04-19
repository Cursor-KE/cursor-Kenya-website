import { desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { AdminPageShell } from '@/components/admin-page-shell'
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

  return (
    <AdminPageShell
      title="Dashboard"
      description="Overview of content, submissions, and admin access requests."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Images', value: stats?.img_c ?? 0, href: '/admin/gallery' },
          { label: 'Videos', value: stats?.vid_c ?? 0, href: '/admin/gallery' },
          { label: 'Forms', value: stats?.form_c ?? 0, href: '/admin/forms' },
          { label: 'Responses', value: stats?.resp_c ?? 0, href: '/admin/responses' },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            aria-label={`${s.label}: ${Number(s.value)}. Open ${s.label} admin.`}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Card
              className="border border-border bg-card/60 backdrop-blur-sm transition-colors group-hover:border-primary/40 group-hover:bg-card/80"
            >
              <CardContent className="space-y-2 p-5">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-semibold tabular-nums text-foreground">{Number(s.value)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {currentUser.user.role === 'super_user' ? (
        <Link
          href="/admin/users"
          aria-label={`Admin approvals: ${pendingAdminCount} pending. Open admin users.`}
          className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Card className="border border-primary/20 bg-primary/5 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
            <CardContent className="space-y-2 p-5">
              <p className="text-sm font-medium text-foreground">Admin approvals</p>
              <p className="text-3xl font-semibold tabular-nums text-foreground">{pendingAdminCount}</p>
              <p className="text-sm text-muted-foreground">
                Pending admin signup{pendingAdminCount === 1 ? '' : 's'} waiting for your review.
              </p>
            </CardContent>
          </Card>
        </Link>
      ) : null}

      <Card className="border border-border bg-card/40">
        <CardContent className="p-5 sm:p-6">
        <h2 className="text-lg font-medium text-foreground">Recent responses</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-1 rounded-xl border border-border/60 bg-background/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-mono text-xs text-foreground/80">{r.formId.slice(0, 8)}…</span>
                <span className="break-words text-xs sm:text-sm">{new Date(r.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
