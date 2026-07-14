import { AdminPageShell } from '@/components/admin-page-shell'
import { getFrameCardSettings } from '@/lib/queries'
import { FrameCardAdminClient } from '@/app/admin/(dashboard)/frame/frame-card-admin-client'

async function AdminFrameCardContent () {
  const settings = await getFrameCardSettings()
  return <FrameCardAdminClient settings={settings} />
}

export default async function AdminFrameCardPage () {
  return (
    <AdminPageShell
      title="Frame Card"
      description="Control the public meetup card title and whether the card generator is visible."
    >
      {await AdminFrameCardContent()}
    </AdminPageShell>
  )
}
