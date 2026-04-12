import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { formResponses, forms } from '@/db/schema'

export default async function AdminResponsesPage () {
  const responses = await db
    .select({
      id: formResponses.id,
      formId: formResponses.formId,
      formTitle: forms.title,
      createdAt: formResponses.createdAt,
    })
    .from(formResponses)
    .leftJoin(forms, eq(formResponses.formId, forms.id))
    .orderBy(desc(formResponses.createdAt))
    .limit(100)

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Responses</h1>
      <p className="mt-1 text-sm text-muted-foreground">Recent form submissions.</p>

      <ul className="mt-8 space-y-2">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          responses.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm"
            >
              <span className="font-medium text-foreground">{r.formTitle ?? r.formId}</span>
              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              {r.formId ? (
                <Link href={`/admin/forms/${r.formId}`} className="text-primary hover:underline">
                  Edit form
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
