import { Suspense } from 'react'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminContentSkeleton } from '@/components/admin-page-skeleton'
import { getFrameCardSettings } from '@/lib/queries'
import { FrameCardAdminClient } from '@/app/admin/(dashboard)/frame/frame-card-admin-client'
import { requireApprovedAdmin } from '@/lib/auth/session'

async function AdminFrameCardContent () {
  await requireApprovedAdmin()

  const settings = await getFrameCardSettings()
  return <FrameCardAdminClient settings={settings} />
}

export default function AdminFrameCardPage () {
  return (
    <AdminPageShell
      title="Frame Card"
      description="Control the public meetup card title and whether the card generator is visible."
    >
      <Suspense fallback={<AdminContentSkeleton variant="default" />}>
        <AdminFrameCardContent />
      </Suspense>
    </AdminPageShell>
  )
}
