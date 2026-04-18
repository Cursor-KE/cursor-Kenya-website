import { ShowcaseAdminClient } from '@/app/admin/(dashboard)/community-showcase/showcase-admin-client'
import { AdminPageShell } from '@/components/admin-page-shell'
import { getAllCommunityShowcaseForAdmin, getLatestShowcaseAiReviewsForAdmin } from '@/lib/queries'

export default async function AdminCommunityShowcasePage () {
  let rows: Awaited<ReturnType<typeof getAllCommunityShowcaseForAdmin>> = []
  let initialReviews: Awaited<ReturnType<typeof getLatestShowcaseAiReviewsForAdmin>> = {}
  try {
    ;[rows, initialReviews] = await Promise.all([
      getAllCommunityShowcaseForAdmin(),
      getLatestShowcaseAiReviewsForAdmin(),
    ])
  } catch {
    // database unavailable
  }

  return (
    <AdminPageShell
      title="Community showcase"
      description="Review submissions, approve or reject, feature approved projects, and set display order."
    >
      {!process.env.OPENAI_API_KEY ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          AI reviews are unavailable until `OPENAI_API_KEY` is configured on the server.
        </p>
      ) : null}
      <ShowcaseAdminClient
        rows={rows}
        aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
        initialReviews={initialReviews}
      />
    </AdminPageShell>
  )
}
