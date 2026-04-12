import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { forms } from '@/db/schema'
import { FormEditor } from '@/app/admin/(dashboard)/forms/form-editor'
import { formDefinitionSchema } from '@/lib/forms/types'

export default async function EditFormPage ({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const rows = await db.select().from(forms).where(eq(forms.id, id)).limit(1)
  const form = rows[0]
  if (!form) notFound()

  const def = formDefinitionSchema.safeParse(form.definition)
  const definition = def.success ? def.data : { blocks: [] }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit form</h1>
      <p className="mt-1 text-sm text-muted-foreground">Update fields and publish.</p>
      <div className="mt-8 max-w-2xl">
        <FormEditor
          initial={{
            id: form.id,
            title: form.title,
            slug: form.slug,
            status: form.status,
            definition,
          }}
        />
      </div>
    </div>
  )
}
