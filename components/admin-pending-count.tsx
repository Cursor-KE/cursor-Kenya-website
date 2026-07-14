import { eq, sql } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db'
import { user } from '@/db/schema'
import { requireApprovedAdmin } from '@/lib/auth/session'

export async function getPendingAdminCount () {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.adminStatus, 'pending'))

  return rows[0]?.count ?? 0
}

export async function PendingAdminNavBadge () {
  const currentUser = await requireApprovedAdmin()
  if (currentUser.user.role !== 'super_user') return null

  const count = await getPendingAdminCount()
  if (count <= 0) return null

  return (
    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
      {count}
    </span>
  )
}

export async function PendingAdminMobileBadge () {
  const currentUser = await requireApprovedAdmin()
  if (currentUser.user.role !== 'super_user') return null

  const count = await getPendingAdminCount()
  if (count <= 0) return null

  return (
    <Badge variant="secondary" className="ml-auto">
      {count} pending
    </Badge>
  )
}
