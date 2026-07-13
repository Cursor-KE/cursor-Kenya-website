import { AdminPageShell } from '@/components/admin-page-shell'
import { RecapEditor } from '../recap-editor'

export default function NewRecapPage () {
  return <AdminPageShell title="New recap" description="Capture the energy, useful ideas, and outcomes from a Cursor Kenya gathering.">
    <RecapEditor initial={{ title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', status: 'draft' }} />
  </AdminPageShell>
}
