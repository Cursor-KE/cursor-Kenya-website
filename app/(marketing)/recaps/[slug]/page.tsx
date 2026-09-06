import type { Metadata } from 'next'
import { and, eq, lte } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock3 } from 'lucide-react'
import { db } from '@/db'
import { recapPosts, user } from '@/db/schema'
import { RecapContent } from '@/components/recap-content'
import { recapDateFormatter, recapReadingMinutes } from '@/lib/recaps/display'

async function getPublishedRecap (slug: string) {
  return (await db.select({
    title: recapPosts.title, slug: recapPosts.slug, excerpt: recapPosts.excerpt,
    content: recapPosts.content, coverImageUrl: recapPosts.coverImageUrl,
    publishedAt: recapPosts.publishedAt, authorName: user.name,
  }).from(recapPosts).innerJoin(user, eq(recapPosts.authorUserId, user.id))
    .where(and(eq(recapPosts.slug, slug), eq(recapPosts.status, 'published'), lte(recapPosts.publishedAt, new Date())))
    .limit(1))[0]
}

export async function generateMetadata ({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedRecap(slug)
  if (!post) return { title: 'Recap not found' }
  return { title: post.title, description: post.excerpt }
}

export default async function RecapDetailPage ({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPublishedRecap(slug)
  if (!post) notFound()
  return <article className="px-4 py-12 sm:px-6 sm:py-20">
    <div className="mx-auto max-w-6xl"><Link href="/recaps" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All recaps</Link>
      <header className="mx-auto mt-10 max-w-4xl text-center"><p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Community recap</p><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">{post.title}</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{post.excerpt}</p><div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground"><span>By {post.authorName}</span><span aria-hidden="true">•</span><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? recapDateFormatter.format(post.publishedAt) : ''}</time><span aria-hidden="true">•</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{recapReadingMinutes(post.content)} min read</span></div></header>
      <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-border/70 bg-secondary"><div className="relative aspect-[16/8]">{post.coverImageUrl ? <div role="img" aria-label="" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, rgb(20 18 11 / .28), transparent), url(${JSON.stringify(post.coverImageUrl)})` }} /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,var(--glow-strong),transparent_32%),linear-gradient(135deg,var(--secondary),var(--background))]" />}</div></div>
      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-[4px_minmax(0,1fr)] gap-6 sm:gap-10"><div className="rounded-full bg-gradient-to-b from-primary via-primary/35 to-transparent" aria-hidden="true" /><RecapContent content={post.content} /></div>
    </div>
  </article>
}
