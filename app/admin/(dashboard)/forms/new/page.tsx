import { AdminPageShell } from '@/components/admin-page-shell'
import { requireApprovedAdminOrRedirect } from '@/lib/auth/admin-route'
import { NewFormChooser } from './new-form-chooser'

export default async function NewFormPage () {
  await requireApprovedAdminOrRedirect()

  return (
    <AdminPageShell
      title="New form"
      description="Start from a blank canvas, or describe your form to AI."
      contentClassName="max-w-4xl"
    >
      <div className="max-w-4xl">
        <NewFormChooser aiEnabled={Boolean(process.env.OPENAI_API_KEY)} />
      </div>
    </AdminPageShell>
  )
}
