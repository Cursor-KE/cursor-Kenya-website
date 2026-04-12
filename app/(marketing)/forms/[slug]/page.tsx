import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { FadeIn } from '@/components/motion-fade'
import { FormRenderer } from '@/components/form-renderer'
import { db } from '@/db'
import { forms } from '@/db/schema'
import { formDefinitionSchema } from '@/lib/forms/types'

export const revalidate = 60

export async function generateMetadata ({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  try {
    const { slug } = await params
    const rows = await db.select().from(forms).where(eq(forms.slug, slug)).limit(1)
    const form = rows[0]
    return {
      title: form ? `${form.title} | Cursor Kenya` : 'Form',
      description: 'Submit a response',
    }
  } catch {
    return { title: 'Form | Cursor Kenya', description: 'Submit a response' }
  }
}

export default async function PublicFormPage ({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const rows = await db.select().from(forms).where(eq(forms.slug, slug)).limit(1)
  const form = rows[0]
  if (!form || form.status !== 'published') notFound()

  const parsed = formDefinitionSchema.safeParse(form.definition)
  if (!parsed.success) notFound()

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{form.title}</h1>
          <p className="mt-2 text-muted-foreground">Please fill in the fields below.</p>
        </FadeIn>
        <div className="mt-10 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-md sm:p-8">
          <FormRenderer slug={slug} definition={parsed.data} />
        </div>
      </div>
    </div>
  )
}
