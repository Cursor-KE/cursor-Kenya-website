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
      {!process.env.OPENAI_API_KEY ? (
        <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          AI reviews are unavailable until `OPENAI_API_KEY` is configured on the server.
        </p>
      ) : null}
      <ShowcaseAdminClient rows={rows} aiEnabled={Boolean(process.env.OPENAI_API_KEY)} />
    </div>
  )
}
