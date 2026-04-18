import { eq, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin-sidebar'
import { db } from '@/db'
import { user } from '@/db/schema'
import {
  ADMIN_APPROVAL_REQUIRED,
  ADMIN_FORBIDDEN,
  SESSION_UNAUTHORIZED,
  requireApprovedAdmin,
} from '@/lib/auth/session'

export default async function AdminDashboardLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const currentUser = await requireApprovedAdmin()
    const pendingAdminCount = currentUser.user.role === 'super_user'
      ? (
          await db
            .select({ count: sql<number>`count(*)::int` })
            .from(user)
            .where(eq(user.adminStatus, 'pending'))
        )[0]?.count ?? 0
      : 0

    return (
      <AdminChrome
        currentUserRole={currentUser.user.role}
        pendingAdminCount={pendingAdminCount}
      >
        {children}
      </AdminChrome>
    )
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === SESSION_UNAUTHORIZED)
    ) {
      redirect('/admin/login')
    }

    if (
      error instanceof Error &&
      (error.message === ADMIN_APPROVAL_REQUIRED || error.message === ADMIN_FORBIDDEN)
    ) {
      redirect('/admin/pending')
    }

    throw error
  }
}
