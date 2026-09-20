import { Suspense } from 'react'
import { AdminChrome } from '@/components/admin-sidebar'
import {
  PendingAdminMobileBadge,
  PendingAdminNavBadge,
} from '@/components/admin-pending-count'
import { AdminPageLoadingSkeleton } from '@/components/admin-page-skeleton'
import { getApprovedAdminOrRedirect } from '@/lib/auth/admin-access'

/**
 * Auth uses headers()/cookies, so awaiting it in the layout body blocks
 * loading.tsx and freezes the previous page during soft navigations.
 * Keep the chrome outside the gate and suspend only the page slot.
 */
async function AdminAccessGate ({ children }: { children: React.ReactNode }) {
  await getApprovedAdminOrRedirect()
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
