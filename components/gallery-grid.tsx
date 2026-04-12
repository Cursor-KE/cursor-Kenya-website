'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ImageModal } from '@/components/image-modal'
import { VideoCard, type VideoItem } from '@/components/video-card'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

export type GalleryImage = {
  id: string
  secureUrl: string
  alt: string | null
  width: number | null
  height: number | null
}

export function GalleryGrid ({
  photos,
  videos: videoList,
  mode,
}: {
  photos: GalleryImage[]
  videos: VideoItem[]
  mode: 'photos' | 'videos'
}) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [lightAlt, setLightAlt] = useState('')
  const [videoOpen, setVideoOpen] = useState<string | null>(null)

  if (mode === 'photos') {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((img, i) => {
            const thumbSrc = cloudinaryScaledUrl(img.secureUrl, 960)
            return (
              <motion.button
                key={img.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => {
                  setLightbox(img.secureUrl)
                  setLightAlt(img.alt ?? '')
                }}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/90 bg-card/40 text-left shadow-[0_0_0_1px_rgb(255_255_255/0.04)] backdrop-blur-md transition hover:border-primary/35 hover:shadow-[0_0_36px_-14px_var(--glow)]"
              >
                <Image
                  src={thumbSrc}
                  alt={img.alt ?? 'Gallery image'}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  unoptimized
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              </motion.button>
            )
          })}
        </div>
        <ImageModal
          open={!!lightbox}
          onOpenChange={(o) => !o && setLightbox(null)}
          src={lightbox}
          alt={lightAlt}
        />
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videoList.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
          >
            <VideoCard video={v} onOpen={() => setVideoOpen(v.youtubeVideoId)} />
          </motion.div>
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
