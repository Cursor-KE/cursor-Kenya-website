import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowUpRight, FilePenLine, Plus } from 'lucide-react'
import { db } from '@/db'
import { recapPosts, user } from '@/db/schema'
import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { setRecapPublication } from '@/lib/actions/recaps'
import { recapDateFormatter } from '@/lib/recaps/display'
import { cn } from '@/lib/utils'

export default async function AdminRecapsPage () {
  const posts = await db.select({
    id: recapPosts.id, title: recapPosts.title, slug: recapPosts.slug,
    excerpt: recapPosts.excerpt, status: recapPosts.status,
    authorName: user.name, publishedAt: recapPosts.publishedAt, updatedAt: recapPosts.updatedAt,
  }).from(recapPosts).innerJoin(user, eq(recapPosts.authorUserId, user.id)).orderBy(desc(recapPosts.updatedAt))

  return <AdminPageShell title="Recap posts" description="Write community field notes, keep drafts private, and publish finished stories for everyone." actions={<Link href="/admin/recaps/new" className={cn(buttonVariants(), 'w-full sm:w-auto')}><Plus />New recap</Link>}>
    <Card className="border-border/70 bg-card/60"><CardHeader><CardTitle>Editorial desk</CardTitle><CardDescription>{posts.length} {posts.length === 1 ? 'story' : 'stories'} across drafts and published recaps.</CardDescription></CardHeader><CardContent>
      {posts.length === 0 ? <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-background/35 px-5 py-14 text-center"><span className="flex size-11 items-center justify-center rounded-xl border border-border text-primary"><FilePenLine /></span><h2 className="mt-4 font-semibold">No recaps yet</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Start with the latest meetup, workshop, or community milestone.</p><Link href="/admin/recaps/new" className={cn(buttonVariants(), 'mt-5')}><Plus />Write the first recap</Link></div> : <ul className="space-y-3">{posts.map((post) => <li key={post.id} className="grid gap-4 rounded-xl border border-border/65 bg-background/40 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><Link href={`/admin/recaps/${post.id}`} className="group min-w-0 outline-none"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-medium group-hover:text-primary">{post.title}</h2><Badge variant={post.status === 'published' ? 'default' : 'secondary'}>{post.status}</Badge></div><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{post.excerpt}</p><p className="mt-2 text-xs text-muted-foreground">By {post.authorName} · Updated {recapDateFormatter.format(post.updatedAt)}{post.publishedAt ? ` · Published ${recapDateFormatter.format(post.publishedAt)}` : ''}</p></Link><div className="flex items-center gap-2"><form action={setRecapPublication}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="status" value={post.status === 'published' ? 'draft' : 'published'} /><Button size="sm" variant="outline">{post.status === 'published' ? 'Unpublish' : 'Publish'}</Button></form><Link href={`/admin/recaps/${post.id}`} className={cn(buttonVariants({ size: 'icon-sm', variant: 'ghost' }))} aria-label={`Edit ${post.title}`}><ArrowUpRight /></Link></div></li>)}</ul>}
    </CardContent></Card>
  </AdminPageShell>
}
