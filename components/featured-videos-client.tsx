'use client'

import { VideoCard } from '@/components/video-card'

export function FeaturedVideosClient ({
  videos,
}: {
  videos: Array<{
    id: string
    youtubeVideoId: string
    title: string | null
    description: string | null
  }>
}) {
  if (videos.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Featured videos will appear here once added in admin.
      </p>
    )
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <VideoCard
          key={v.id}
          video={v}
          onOpen={() =>
            window.open(
              `https://www.youtube.com/watch?v=${v.youtubeVideoId}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
        />
      ))}
    </div>
  )
}
