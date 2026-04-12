'use client'

import { useState } from 'react'
import { GalleryGrid, type GalleryImage } from '@/components/gallery-grid'
import type { VideoItem } from '@/components/video-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function GalleryView ({
  photos,
  videos,
}: {
  photos: GalleryImage[]
  videos: VideoItem[]
}) {
  const [mode, setMode] = useState<'photos' | 'videos'>('photos')

  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as 'photos' | 'videos')}>
      <TabsList className="bg-secondary/80">
        <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
        <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="photos" className="mt-8">
        {photos.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No photos yet. Upload from the admin gallery.
          </p>
        ) : (
          <GalleryGrid photos={photos} videos={[]} mode="photos" />
        )}
      </TabsContent>
      <TabsContent value="videos" className="mt-8">
        {videos.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No videos yet. Add YouTube IDs in admin.
          </p>
        ) : (
          <GalleryGrid photos={[]} videos={videos} mode="videos" />
        )}
      </TabsContent>
    </Tabs>
  )
}
