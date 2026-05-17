import { AdminPageShell } from '@/components/admin-page-shell'
import { getFrameCardSettings } from '@/lib/queries'
import { FrameCardAdminClient } from '@/app/admin/(dashboard)/frame/frame-card-admin-client'

export default async function AdminFrameCardPage () {
  const settings = await getFrameCardSettings()

  return (
    <AdminPageShell
      title="Frame Card"
      description="Control the public meetup card title and whether the card generator is visible."
    >
      <FrameCardAdminClient settings={settings} />
    </AdminPageShell>
  )
}
