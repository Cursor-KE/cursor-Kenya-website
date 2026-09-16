import { Suspense } from 'react'
import { AdminChrome } from '@/components/admin-sidebar'
import {
  PendingAdminMobileBadge,
  PendingAdminNavBadge,
} from '@/components/admin-pending-count'
import { AdminPageLoadingSkeleton } from '@/components/admin-page-skeleton'
import { requireApprovedAdminOrRedirect } from '@/lib/auth/admin-route'

export default async function AdminDashboardLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedAdminOrRedirect()

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
        {children}
      </Suspense>
    </AdminChrome>
  )
}
