import { BRAND } from '@/lib/brand'
import { AdminPageShell } from '@/components/admin-page-shell'
import { requireApprovedAdminOrRedirect } from '@/lib/auth/admin-route'
import { RecapEditor } from '../recap-editor'

export default async function NewRecapPage () {
  await requireApprovedAdminOrRedirect()

  return <AdminPageShell title="New recap" description={`Capture the energy, useful ideas, and outcomes from a ${BRAND.name} gathering.`}>
    <RecapEditor initial={{ title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', status: 'draft' }} />
  </AdminPageShell>
}
