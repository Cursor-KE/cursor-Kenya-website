import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { AdminPageShell } from '@/components/admin-page-shell'
import { db } from '@/db'
import { forms } from '@/db/schema'
import { FormEditor } from '@/app/admin/(dashboard)/forms/form-editor'
import { requireApprovedAdmin } from '@/lib/auth/session'
import { formDefinitionSchema } from '@/lib/forms/types'

export default async function EditFormPage ({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireApprovedAdmin()

  const { id } = await params
  const rows = await db.select().from(forms).where(eq(forms.id, id)).limit(1)
  const form = rows[0]
  if (!form) notFound()

  const def = formDefinitionSchema.safeParse(form.definition)
  const definition = def.success ? def.data : { blocks: [] }

  return (
    <AdminPageShell
      title="Edit form"
      description="Update fields and publish."
      contentClassName="max-w-4xl"
    >
      <div className="max-w-4xl">
        <FormEditor
          initial={{
            id: form.id,
            title: form.title,
            slug: form.slug,
            status: form.status,
            definition,
          }}
          aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
        />
      </div>
    </AdminPageShell>
  )
}
