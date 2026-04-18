import { desc, eq, sql } from 'drizzle-orm'
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
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of content, submissions, and admin access requests.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Images', value: stats?.img_c ?? 0 },
          { label: 'Videos', value: stats?.vid_c ?? 0 },
          { label: 'Forms', value: stats?.form_c ?? 0 },
          { label: 'Responses', value: stats?.resp_c ?? 0 },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm"
          >
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{Number(s.value)}</p>
          </div>
        ))}
      </div>

      {currentUser.user.role === 'super_user' ? (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm font-medium text-foreground">Admin approvals</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {pendingAdminCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pending admin signup{pendingAdminCount === 1 ? '' : 's'} waiting for your review.
          </p>
        </div>
      ) : null}

      <div className="mt-10 rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="text-lg font-medium text-foreground">Recent responses</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {recent.map((r) => (
              <li key={r.id} className="flex justify-between gap-4">
                <span className="font-mono text-xs text-foreground/80">{r.formId.slice(0, 8)}…</span>
                <span>{new Date(r.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
