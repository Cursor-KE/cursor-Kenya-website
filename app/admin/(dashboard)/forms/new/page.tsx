import { FormEditor } from '@/app/admin/(dashboard)/forms/form-editor'

export default function NewFormPage () {
  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">New form</h1>
      <p className="mt-1 text-sm text-muted-foreground">Add blocks, then publish when ready.</p>
      <div className="mt-8 max-w-2xl">
        <FormEditor />
      </div>
    </div>
  )
}
