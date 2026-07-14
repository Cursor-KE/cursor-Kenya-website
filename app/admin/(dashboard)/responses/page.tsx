import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { ArrowUpRight, ListChecks } from 'lucide-react'
import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { db } from '@/db'
import { formResponses, forms } from '@/db/schema'

async function AdminResponsesContent () {
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
    <Card className="border-border/70 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardAction>
          <Badge variant="outline">{responses.length} loaded</Badge>
        </CardAction>
        <CardTitle>Submission stream</CardTitle>
        <CardDescription>Latest 100 responses across every public form.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {responses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/45 px-4 py-10 text-center text-sm text-muted-foreground">
              No responses yet.
            </p>
          ) : (
            responses.map((r, index) => (
              <li key={r.id}>
                <Link
                  href={`/admin/responses/${r.id}`}
                  prefetch
                  className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-background/45 px-4 py-4 text-sm transition-colors hover:border-primary/40 hover:bg-background/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                      <ListChecks />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words font-medium text-foreground">
                        {r.formTitle ?? r.formId}
                      </span>
                      <span className="block text-xs text-muted-foreground">Response #{index + 1}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                    <ArrowUpRight className="transition-colors group-hover:text-primary" />
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

export default async function AdminResponsesPage () {
  return (
    <AdminPageShell
      title="Responses"
      description="Review recent form submissions and route useful answers into follow-up workflows."
    >
      {await AdminResponsesContent()}
    </AdminPageShell>
  )
}
