import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { AdminPageShell } from '@/components/admin-page-shell'
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
    <AdminPageShell
      title="Responses"
      description="Recent form submissions."
    >
      <ul className="space-y-3">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          responses.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 px-4 py-4 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            >
              <span className="break-words font-medium text-foreground">{r.formTitle ?? r.formId}</span>
              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              {r.formId ? (
                <Link href={`/admin/forms/${r.formId}`} className="w-fit text-primary hover:underline">
                  Edit form
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </AdminPageShell>
  )
}
