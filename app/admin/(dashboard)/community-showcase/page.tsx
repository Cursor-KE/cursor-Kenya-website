import { ShowcaseAdminClient } from '@/app/admin/(dashboard)/community-showcase/showcase-admin-client'
import { AdminPageShell } from '@/components/admin-page-shell'
import { getAllCommunityShowcaseForAdmin, getLatestShowcaseAiReviewsForAdmin } from '@/lib/queries'
import { serializeCommunityShowcaseAdminRows } from '@/lib/showcase/admin-serialization'

const ADMIN_SHOWCASE_QUERY_TIMEOUT_MS = 12_000

function withTimeout<T> (promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Community showcase admin query timed out.')), timeoutMs)
    }),
  ])
}

export default async function AdminCommunityShowcasePage () {
  let rows: Awaited<ReturnType<typeof getAllCommunityShowcaseForAdmin>> = []
  let initialReviews: Awaited<ReturnType<typeof getLatestShowcaseAiReviewsForAdmin>> = {}
  let loadErrorMessage: string | null = null

  try {
    ;[rows, initialReviews] = await withTimeout(
      Promise.all([
        getAllCommunityShowcaseForAdmin(),
        getLatestShowcaseAiReviewsForAdmin(),
      ]),
      ADMIN_SHOWCASE_QUERY_TIMEOUT_MS
    )
  } catch (error) {
    console.error('[AdminCommunityShowcasePage]', error)
    loadErrorMessage = 'Could not load showcase submissions. Check the database connection, then refresh this page.'
  }

  const serializedRows = serializeCommunityShowcaseAdminRows(rows)

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
        rows={serializedRows}
        aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
        initialReviews={initialReviews}
        loadErrorMessage={loadErrorMessage}
      />
    </AdminPageShell>
  )
}
