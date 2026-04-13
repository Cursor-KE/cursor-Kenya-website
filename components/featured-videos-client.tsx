'use client'

import { useState } from 'react'
import { VideoCard } from '@/components/video-card'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const [videoOpen, setVideoOpen] = useState<string | null>(null)

  if (videos.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Featured videos will appear here once added in admin.
      </p>
    )
  }
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            video={v}
            onOpen={() => setVideoOpen(v.youtubeVideoId)}
          />
        ))}
      </div>
      <Dialog open={!!videoOpen} onOpenChange={(o) => !o && setVideoOpen(null)}>
        <DialogContent className="max-w-4xl border-border bg-popover p-0 sm:max-w-4xl">
          <DialogTitle className="sr-only">Video</DialogTitle>
          {videoOpen ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                title="YouTube"
                src={`https://www.youtube.com/embed/${videoOpen}?autoplay=1`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
