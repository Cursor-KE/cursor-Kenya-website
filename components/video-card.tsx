'use client'

import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VideoItem = {
  id: string
  youtubeVideoId: string
  title: string | null
  description: string | null
}

function thumbUrl (videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function VideoCard ({
  video,
  onOpen,
  className,
}: {
  video: VideoItem
  onOpen?: () => void
  className?: string
}) {
  const title = video.title ?? 'Video'
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={onOpen}
      className={cn(
        'group w-full overflow-hidden rounded-2xl border border-border/90 bg-card/50 text-left shadow-[0_0_0_1px_rgb(255_255_255/0.04)] backdrop-blur-md transition hover:border-primary/35 hover:shadow-[0_0_36px_-14px_var(--glow)]',
        className
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbUrl(video.youtubeVideoId)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-90 transition group-hover:bg-black/45">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-2 ring-white/30">
            <Play className="ml-1 h-7 w-7 text-white" fill="currentColor" />
          </span>
        </div>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 font-medium leading-snug text-foreground">{title}</p>
        {video.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
        ) : null}
      </div>
    </motion.button>
  )
}
