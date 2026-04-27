import { AdminPageShell } from '@/components/admin-page-shell'
import { getAllTestimonialsForAdmin } from '@/lib/queries'
import {
  TestimonialsAdminClient,
  type AdminTestimonial,
} from './testimonials-admin-client'

export default async function AdminTestimonialsPage () {
  const rows = await getAllTestimonialsForAdmin()
  const initial: AdminTestimonial[] = rows.map((r) => ({
    id: r.id,
    formId: r.formId,
    responseId: r.responseId,
    question: r.question,
    quote: r.quote,
    attendeeName: r.attendeeName,
    attendeeRole: r.attendeeRole,
    published: r.published,
    featured: r.featured,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <AdminPageShell
      title="Testimonials"
      description="Quotes from form responses that admins have shared. Published testimonials show on the homepage."
      contentClassName="max-w-4xl"
    >
      <TestimonialsAdminClient initial={initial} />
    </AdminPageShell>
  )
}
