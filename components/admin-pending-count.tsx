import { eq, sql } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db'
import { user } from '@/db/schema'
import {
  ADMIN_APPROVAL_REQUIRED,
  ADMIN_FORBIDDEN,
  SESSION_UNAUTHORIZED,
  requireApprovedAdmin,
} from '@/lib/auth/session'

export async function getPendingAdminCount () {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.adminStatus, 'pending'))

  return rows[0]?.count ?? 0
}

function isExpectedAdminAccessError (error: unknown): boolean {
  return error instanceof Error && [
    ADMIN_APPROVAL_REQUIRED,
    ADMIN_FORBIDDEN,
    SESSION_UNAUTHORIZED,
  ].includes(error.message)
}

async function canShowPendingAdminBadge (): Promise<boolean> {
  try {
    const currentUser = await requireApprovedAdmin()
    return currentUser.user.role === 'super_user'
  } catch (error) {
    if (isExpectedAdminAccessError(error)) return false
    throw error
  }
}

export async function PendingAdminNavBadge () {
  if (!(await canShowPendingAdminBadge())) return null

  const count = await getPendingAdminCount()
  if (count <= 0) return null

  return (
    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
      {count}
    </span>
  )
}

export async function PendingAdminMobileBadge () {
  if (!(await canShowPendingAdminBadge())) return null

  const count = await getPendingAdminCount()
  if (count <= 0) return null

  return (
    <Badge variant="secondary" className="ml-auto">
      {count} pending
    </Badge>
  )
}
