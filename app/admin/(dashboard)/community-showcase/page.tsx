import { ShowcaseAdminClient } from '@/app/admin/(dashboard)/community-showcase/showcase-admin-client'
import { getAllCommunityShowcaseForAdmin } from '@/lib/queries'

export default async function AdminCommunityShowcasePage () {
  let rows: Awaited<ReturnType<typeof getAllCommunityShowcaseForAdmin>> = []
  try {
    rows = await getAllCommunityShowcaseForAdmin()
  } catch {
    // database unavailable
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Community showcase</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review submissions, approve or reject, feature approved projects, and set display order.
      </p>
      <ShowcaseAdminClient rows={rows} />
    </div>
  )
}
