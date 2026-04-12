import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import { forms } from '@/db/schema'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default async function AdminFormsListPage () {
  const rows = await db.select().from(forms).orderBy(desc(forms.updatedAt))

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Forms</h1>
          <p className="mt-1 text-sm text-muted-foreground">Drag-and-drop builder and public URLs.</p>
        </div>
        <Link
          href="/admin/forms/new"
          className={cn(
            buttonVariants(),
            'bg-gradient-to-r from-primary to-primary-end text-primary-foreground'
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New form
        </Link>
      </div>

      <ul className="mt-8 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No forms yet.</p>
        ) : (
          rows.map((f) => (
            <li key={f.id}>
              <Link
                href={`/admin/forms/${f.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3 transition hover:border-primary/40"
              >
                <span className="font-medium text-foreground">{f.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={f.status === 'published' ? 'default' : 'secondary'}>{f.status}</Badge>
                  <span className="text-xs text-muted-foreground">/{f.slug}</span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
