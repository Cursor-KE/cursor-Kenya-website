import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { db } from '@/db'
import { recapPosts } from '@/db/schema'
import { AdminPageShell } from '@/components/admin-page-shell'
import { requireApprovedAdmin } from '@/lib/auth/session'
import { RecapEditor } from '../recap-editor'

export default async function EditRecapPage ({ params }: { params: Promise<{ id: string }> }) {
  await requireApprovedAdmin()

  const { id } = await params
  const post = (await db.select().from(recapPosts).where(eq(recapPosts.id, id)).limit(1))[0]
  if (!post) notFound()
  return <AdminPageShell title="Edit recap" description={post.status === 'published' ? 'Changes to this published story appear publicly after saving.' : 'This draft is private until you publish it.'}>
    <RecapEditor initial={{ id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, coverImageUrl: post.coverImageUrl ?? '', status: post.status }} />
  </AdminPageShell>
}
