import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin-sidebar'
import {
  PendingAdminMobileBadge,
  PendingAdminNavBadge,
} from '@/components/admin-pending-count'
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
  let currentUser: Awaited<ReturnType<typeof requireApprovedAdmin>>

  try {
    currentUser = await requireApprovedAdmin()
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

  const isSuperUser = currentUser.user.role === 'super_user'

  return (
    <AdminChrome
      currentUserRole={currentUser.user.role}
      pendingNavBadge={
        isSuperUser ? (
          <Suspense fallback={null}>
            <PendingAdminNavBadge />
          </Suspense>
        ) : null
      }
      pendingMobileBadge={
        isSuperUser ? (
          <Suspense fallback={null}>
            <PendingAdminMobileBadge />
          </Suspense>
        ) : null
      }
    >
      {children}
    </AdminChrome>
  )
}
