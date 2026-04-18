import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import { forms } from '@/db/schema'
import { AdminPageShell } from '@/components/admin-page-shell'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default async function AdminFormsListPage () {
  const rows = await db.select().from(forms).orderBy(desc(forms.updatedAt))

  return (
    <AdminPageShell
      title="Forms"
      description="Drag-and-drop builder and public URLs."
      actions={(
        <Link
          href="/admin/forms/new"
          className={cn(
            buttonVariants(),
            'w-full bg-gradient-to-r from-primary to-primary-end text-primary-foreground sm:w-auto'
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New form
        </Link>
      )}
    >
      <ul className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No forms yet.</p>
        ) : (
          rows.map((f) => (
            <li key={f.id}>
              <Link
                href={`/admin/forms/${f.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 px-4 py-4 transition hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="break-words font-medium text-foreground">{f.title}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={f.status === 'published' ? 'default' : 'secondary'}>{f.status}</Badge>
                  <span className="break-all text-xs text-muted-foreground">/{f.slug}</span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </AdminPageShell>
  )
}
