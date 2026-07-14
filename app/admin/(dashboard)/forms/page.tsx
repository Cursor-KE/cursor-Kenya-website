import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { ArrowUpRight, FileText, Plus } from 'lucide-react'
import { db } from '@/db'
import { forms } from '@/db/schema'
import { AdminPageShell } from '@/components/admin-page-shell'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

async function AdminFormsListContent () {
  const rows = await db.select().from(forms).orderBy(desc(forms.updatedAt))

  return (
    <Card className="border-border/70 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardAction>
          <Badge variant="outline">{rows.length} total</Badge>
        </CardAction>
        <CardTitle>Form inventory</CardTitle>
        <CardDescription>Manage public URLs, publish state, and builder drafts.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/45 px-4 py-10 text-center text-sm text-muted-foreground">
              No forms yet.
            </p>
          ) : (
            rows.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/admin/forms/${f.id}`}
                  prefetch
                  className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-background/45 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-background/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                      <FileText />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words font-medium text-foreground">{f.title}</span>
                      <span className="block break-all text-xs text-muted-foreground">/{f.slug}</span>
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={f.status === 'published' ? 'default' : 'secondary'}>{f.status}</Badge>
                    <ArrowUpRight className="text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

export default async function AdminFormsListPage () {
  return (
    <AdminPageShell
      title="Forms"
      description="Drag-and-drop builder and public URLs."
      actions={(
        <Link
          href="/admin/forms/new"
          prefetch
          className={cn(
            buttonVariants(),
            'w-full shadow-[0_16px_48px_var(--glow)] sm:w-auto'
          )}
        >
          <Plus data-icon="inline-start" />
          New form
        </Link>
      )}
    >
      {await AdminFormsListContent()}
    </AdminPageShell>
  )
}
