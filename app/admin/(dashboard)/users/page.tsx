import { type InferSelectModel, desc, eq } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { AdminPageShell } from '@/components/admin-page-shell'
import { db } from '@/db'
import { user } from '@/db/schema'
import { approveAdminUser, rejectAdminUser } from '@/lib/actions/admin-users'
import { requireSuperUser } from '@/lib/auth/session'

type AdminUserRow = InferSelectModel<typeof user>

async function getUsersByStatus (status: 'pending' | 'approved' | 'rejected') {
  return db
    .select()
    .from(user)
    .where(eq(user.adminStatus, status))
    .orderBy(desc(user.createdAt))
}

function UserActionRow ({
  userId,
  canApprove,
  canReject,
}: {
  userId: string
  canApprove: boolean
  canReject: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canApprove ? (
        <form action={approveAdminUser.bind(null, userId)}>
          <Button type="submit" size="sm">
            Approve
          </Button>
        </form>
      ) : null}
      {canReject ? (
        <form action={rejectAdminUser.bind(null, userId)}>
          <Button type="submit" size="sm" variant="outline">
            Reject
          </Button>
        </form>
      ) : null}
    </div>
  )
}

function UserSection ({
  title,
  description,
  rows,
  canApprove,
  canReject,
}: {
  title: string
  description: string
  rows: AdminUserRow[]
  canApprove: boolean
  canReject: boolean
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No users in this group.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/70 p-4 xl:flex-row xl:items-center xl:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words font-medium text-foreground">{row.name}</p>
                <p className="break-all text-sm text-muted-foreground">{row.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Signed up {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
              <UserActionRow
                userId={row.id}
                canApprove={canApprove}
                canReject={canReject}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default async function AdminUsersPage () {
  await requireSuperUser()

  const [pendingUsers, approvedUsers, rejectedUsers] = await Promise.all([
    getUsersByStatus('pending'),
    getUsersByStatus('approved'),
    getUsersByStatus('rejected'),
  ])

  return (
    <AdminPageShell
      title="Admin users"
      description="Review admin signup requests, approve access, and keep track of which accounts are still waiting."
    >
      <div className="space-y-6">
        <UserSection
          title="Pending approvals"
          description="New admin signups appear here until you review them."
          rows={pendingUsers}
          canApprove
          canReject
        />
        <UserSection
          title="Approved admins"
          description="These admins can already access the dashboard."
          rows={approvedUsers.filter((row) => row.role !== 'super_user')}
          canApprove={false}
          canReject
        />
        <UserSection
          title="Rejected requests"
          description="You can approve a rejected request later if access should be restored."
          rows={rejectedUsers}
          canApprove
          canReject={false}
        />
      </div>
    </AdminPageShell>
  )
}
