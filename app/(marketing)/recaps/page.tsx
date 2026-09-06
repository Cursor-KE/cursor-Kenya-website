import { BRAND } from '@/lib/brand'
import { and, desc, eq, lte } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowUpRight, Clock3, Newspaper } from 'lucide-react'
import { db } from '@/db'
import { recapPosts, user } from '@/db/schema'
import { Badge } from '@/components/ui/badge'
import { recapDateFormatter, recapReadingMinutes } from '@/lib/recaps/display'

export const dynamic = 'force-dynamic'

export default async function RecapsPage () {
  const posts = await db.select({
    id: recapPosts.id, title: recapPosts.title, slug: recapPosts.slug,
    excerpt: recapPosts.excerpt, content: recapPosts.content,
    coverImageUrl: recapPosts.coverImageUrl, publishedAt: recapPosts.publishedAt,
    authorName: user.name,
  }).from(recapPosts)
    .innerJoin(user, eq(recapPosts.authorUserId, user.id))
    .where(and(eq(recapPosts.status, 'published'), lte(recapPosts.publishedAt, new Date())))
    .orderBy(desc(recapPosts.publishedAt))

  const [lead, ...rest] = posts
  return <div className="px-4 py-14 sm:px-6 sm:py-20">
    <div className="mx-auto max-w-6xl">
      <header className="grid gap-6 border-b border-border/80 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Community field notes</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Recaps from the room.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">What we built, learned, and talked about at {BRAND.name} gatherings.</p></div>
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"><span className="size-2 rounded-full bg-primary shadow-[0_0_18px_var(--glow-strong)]" />{posts.length} published {posts.length === 1 ? 'note' : 'notes'}</div>
      </header>

      {!lead ? <div className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/35 px-6 text-center"><span className="flex size-12 items-center justify-center rounded-xl border border-border bg-background text-primary"><Newspaper /></span><h2 className="mt-5 text-xl font-semibold">The first recap is being written</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Published stories from meetups and workshops will appear here.</p></div> : <>
        <Link href={`/recaps/${lead.slug}`} className="group mt-10 grid overflow-hidden rounded-2xl border border-border/70 bg-card/55 outline-none transition-colors hover:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-72 overflow-hidden bg-secondary lg:min-h-[430px]">{lead.coverImageUrl ? <div role="img" aria-label="" className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transition-none" style={{ backgroundImage: `linear-gradient(to top, rgb(20 18 11 / .45), transparent 60%), url(${JSON.stringify(lead.coverImageUrl)})` }} /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,var(--glow-strong),transparent_35%),linear-gradient(135deg,var(--secondary),var(--background))]" />}<span className="absolute left-5 top-5 rounded-full border border-white/15 bg-background/75 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] backdrop-blur">Latest recap</span></div>
          <article className="relative flex flex-col justify-end p-6 sm:p-9"><div className="absolute left-0 top-9 hidden h-24 w-1 rounded-r-full bg-primary shadow-[0_0_28px_var(--glow-strong)] lg:block" /><RecapMeta post={lead} /><h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{lead.title}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">{lead.excerpt}</p><span className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary">Read the field note <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></article>
        </Link>
        {rest.length ? <section className="mt-12"><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Earlier notes</h2><span className="h-px flex-1 bg-border/70 ml-5" /></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{rest.map((post, index) => <Link key={post.id} href={`/recaps/${post.slug}`} className="group flex min-h-80 flex-col rounded-2xl border border-border/70 bg-card/45 p-6 outline-none transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-primary"><span className="font-mono text-xs text-primary">NO. {String(index + 2).padStart(2, '0')}</span><h3 className="mt-8 text-2xl font-semibold tracking-tight group-hover:text-primary">{post.title}</h3><p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{post.excerpt}</p><div className="mt-auto pt-8"><RecapMeta post={post} compact /></div></Link>)}</div></section> : null}
      </>}
    </div>
  </div>
}

function RecapMeta ({ post, compact = false }: { post: { publishedAt: Date | null; authorName: string; content: string }; compact?: boolean }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground"><Badge variant="outline" className="bg-background/35">{post.publishedAt ? recapDateFormatter.format(post.publishedAt) : 'Unscheduled'}</Badge>{!compact ? <span>By {post.authorName}</span> : null}<span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{recapReadingMinutes(post.content)} min</span></div>
}
