import { AdminPageShell } from '@/components/admin-page-shell'
import { NewFormChooser } from './new-form-chooser'

export default function NewFormPage () {
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
