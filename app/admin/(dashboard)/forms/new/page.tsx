import { FormEditor } from '@/app/admin/(dashboard)/forms/form-editor'
import { AdminPageShell } from '@/components/admin-page-shell'

export default function NewFormPage () {
  return (
    <AdminPageShell
      title="New form"
      description="Add blocks, then publish when ready."
      contentClassName="max-w-4xl"
    >
      <div className="max-w-4xl">
        <FormEditor />
      </div>
    </AdminPageShell>
  )
}
