import { FadeIn } from '@/components/motion-fade'
import { CommunityShowcaseForm } from '@/components/community-showcase-form'
import { CommunityShowcaseGrid } from '@/components/community-showcase-grid'
import { CommunityShowcaseKindFilters } from '@/components/community-showcase-kind-filters'
import { getApprovedCommunityShowcase } from '@/lib/queries'
import { countShowcaseProjectsByKind, parseShowcaseKindQuery, normalizeStoredProjectKind } from '@/lib/showcase/project-kind'

export const revalidate = 60

export const metadata = {
  title: 'Community showcase | Cursor Kenya',
  description: 'Projects built with Cursor by the Nairobi community.',
}

export default async function CommunityShowcasePage ({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const sp = await searchParams
  const activeKind = parseShowcaseKindQuery(sp.kind)

  let projects: Awaited<ReturnType<typeof getApprovedCommunityShowcase>> = []
  try {
    projects = await getApprovedCommunityShowcase()
  } catch {
    // database not configured
  }

  const kindCounts = countShowcaseProjectsByKind(projects)
  const filtered =
    activeKind == null
      ? projects
      : projects.filter((p) => normalizeStoredProjectKind(p.projectKind) === activeKind)

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Community showcase
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Share something you shipped with Cursor. Submissions are reviewed before they appear below.
          </p>
        </FadeIn>

        <section className="mt-12 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Submit your project</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Include at least two screenshots and a link to a live demo or product page.
          </p>
          <div className="mt-8">
            <CommunityShowcaseForm />
          </div>
        </section>

        <section className="mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Featured builds
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Approved projects from the community.
              </p>
            </div>
            {projects.length > 0 ? (
              <CommunityShowcaseKindFilters
                activeKind={activeKind}
                counts={kindCounts}
                total={projects.length}
              />
            ) : null}
          </div>
          <div className="mt-5">
            <CommunityShowcaseGrid
              projects={filtered}
              emptyFilterMessage={
                activeKind != null && filtered.length === 0
                  ? 'No approved projects in this category yet. Try another filter or submit yours above.'
                  : undefined
              }
            />
          </div>
        </section>
      </div>
    </div>
  )
}
