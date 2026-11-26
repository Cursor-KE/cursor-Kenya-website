import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowUpRight, Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import posts from './posts.json'

export const metadata: Metadata = {
  title: 'Community Posts',
  description: 'Public posts from Cursor Kenya meetups, build nights, and Grok Bot events in Kenya.',
}

const topics = [
  { id: 'grok-bot', title: 'Grok Bot events' },
  { id: 'cursor-kenya', title: 'Cursor Kenya' },
]

const postDate = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeZone: 'Africa/Nairobi',
})

export default function CommunityPostsPage () {
  return (
    <div className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-border/80 pb-8">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Community Posts</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Announcements and highlights from Cursor Kenya and Grok Bot events in Kenya, shared on X.
          </p>
          <nav aria-label="Post topics" className="mt-6 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <a key={topic.id} href={`#${topic.id}`} className={buttonVariants({ variant: 'outline' })}>
                {topic.title}
              </a>
            ))}
          </nav>
        </header>

        {topics.map((topic) => (
          <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-heading`} className="mt-10 scroll-mt-24">
            <h2 id={`${topic.id}-heading`} className="text-2xl font-semibold tracking-tight">{topic.title}</h2>
            <div className="mt-5 grid items-start gap-5 md:grid-cols-2">
              {posts.filter((post) => post.topic === topic.id).map((post) => (
                <CommunityPostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function CommunityPostCard ({ post }: { post: (typeof posts)[number] }) {
  const cardPath = `/community-posts/${post.id}.png`
  const sourceUrl = `https://x.com/${post.handle}/status/${post.id}`

  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
        <h3 className="text-base font-semibold">{post.event}</h3>
        <time className="text-sm text-muted-foreground" dateTime={post.createdAt}>
          {postDate.format(new Date(post.createdAt))}
        </time>
      </header>
      <figure className="border-y border-border/80 bg-black">
        <Image
          src={cardPath}
          width={post.width}
          height={post.height}
          alt=""
          className="mx-auto h-auto w-full max-w-[470px]"
          unoptimized
        />
        <figcaption className="sr-only">
          <p>{post.author} (@{post.handle})</p>
          <blockquote cite={sourceUrl} className="whitespace-pre-line">{post.text}</blockquote>
          {post.imageDescription ? <p>{post.imageDescription}</p> : null}
        </figcaption>
      </figure>
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <a
          href={sourceUrl}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-primary')}
          aria-label={`View ${post.event} by @${post.handle} on X`}
        >
          View on X <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
        <a
          href={cardPath}
          download={`community-post-${post.id}.png`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          aria-label={`Download PNG for ${post.event} by @${post.handle}`}
        >
          <Download aria-hidden="true" className="size-4" /> Download PNG
        </a>
      </div>
    </article>
  )
}
