import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin-sidebar'
import {
  PendingAdminMobileBadge,
  PendingAdminNavBadge,
} from '@/components/admin-pending-count'
import { AdminPageLoadingSkeleton } from '@/components/admin-page-skeleton'
import {
  SESSION_UNAUTHORIZED,
  getOptionalCurrentUser,
} from '@/lib/auth/session'

/**
 * Auth uses headers()/cookies, so awaiting it in the layout body blocks
 * loading.tsx and freezes the previous page during soft navigations.
 * Keep the chrome outside the gate and suspend only the page slot.
 */
async function AdminAccessGate ({ children }: { children: React.ReactNode }) {
  let currentUser: Awaited<ReturnType<typeof getOptionalCurrentUser>>

  try {
    currentUser = await getOptionalCurrentUser()
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === SESSION_UNAUTHORIZED
    ) {
      redirect('/admin/login')
    }

    throw error
  }

  if (!currentUser) {
    redirect('/admin/login')
  }

  if (currentUser.user.adminStatus !== 'approved') {
    redirect('/admin/pending')
  }

  return children
}

export default function AdminDashboardLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminChrome
      pendingNavBadge={(
        <Suspense fallback={null}>
          <PendingAdminNavBadge />
        </Suspense>
      )}
      pendingMobileBadge={(
        <Suspense fallback={null}>
          <PendingAdminMobileBadge />
        </Suspense>
      )}
    >
      <Suspense fallback={<AdminPageLoadingSkeleton variant="default" />}>
        <AdminAccessGate>{children}</AdminAccessGate>
      </Suspense>
    </AdminChrome>
  )
}
