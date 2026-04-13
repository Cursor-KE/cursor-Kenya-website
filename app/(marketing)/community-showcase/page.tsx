import { FadeIn } from '@/components/motion-fade'
import { CommunityShowcaseForm } from '@/components/community-showcase-form'
import { CommunityShowcaseGrid } from '@/components/community-showcase-grid'
import { getApprovedCommunityShowcase } from '@/lib/queries'

export const revalidate = 60

export const metadata = {
  title: 'Community showcase | Cursor Kenya',
  description: 'Projects built with Cursor by the Nairobi community.',
}

export default async function CommunityShowcasePage () {
  let projects: Awaited<ReturnType<typeof getApprovedCommunityShowcase>> = []
  try {
    projects = await getApprovedCommunityShowcase()
  } catch {
    // database not configured
  }

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
          <h2 className="text-xl font-semibold text-foreground">Featured builds</h2>
          <p className="mt-1 text-sm text-muted-foreground">Approved projects from the community.</p>
          <div className="mt-8">
            <CommunityShowcaseGrid projects={projects} />
          </div>
        </section>
      </div>
    </div>
  )
}
