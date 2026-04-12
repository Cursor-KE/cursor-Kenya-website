'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Images } from 'lucide-react'
import { useState } from 'react'
import { ImageModal } from '@/components/image-modal'
import { buttonVariants } from '@/components/ui/button'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import { cn } from '@/lib/utils'
import type { HomeGalleryPhoto } from '@/lib/gallery/types'

function MosaicCell ({
  photo,
  index,
  className,
  thumbWidth,
  onOpen,
}: {
  photo: HomeGalleryPhoto
  index: number
  className?: string
  thumbWidth: number
  onOpen: () => void
}) {
  const src = cloudinaryScaledUrl(photo.secureUrl, thumbWidth)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.995 }}
      onClick={onOpen}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/80 bg-card/30 text-left shadow-[0_0_0_1px_rgb(255_255_255/0.04)] outline-none transition hover:border-primary/35 hover:shadow-[0_0_40px_-16px_var(--glow)] focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <Image
        src={src}
        alt={photo.alt ?? 'Community photo'}
        fill
        className="object-cover transition duration-500 group-hover:scale-[1.04]"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        unoptimized
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/70 px-2 py-1 text-xs font-medium text-foreground opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
        View
      </span>
    </motion.button>
  )
}

export function HomeGalleryMosaic ({ photos }: { photos: HomeGalleryPhoto[] }) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  if (photos.length === 0) return null

  const open = (p: HomeGalleryPhoto) => {
    setLightbox({ src: p.secureUrl, alt: p.alt ?? 'Community photo' })
  }

  return (
    <section className="border-t border-border/60 bg-gradient-to-b from-card/15 to-transparent px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Community</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Moments from meetups
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Photos from our events — hover to peek, click to open full size.
            </p>
          </div>
          <Link
            href="/gallery"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'shrink-0 gap-2 border-border/80 bg-card/30'
            )}
          >
            <Images className="h-4 w-4" />
            Full gallery
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {photos.length === 1 ? (
          <MosaicCell
            photo={photos[0]}
            index={0}
            thumbWidth={1400}
            className="relative aspect-[16/9] w-full"
            onOpen={() => open(photos[0])}
          />
        ) : photos.length === 2 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {photos.map((p, i) => (
              <MosaicCell
                key={p.id}
                photo={p}
                index={i}
                thumbWidth={900}
                className="relative aspect-[4/3] w-full"
                onOpen={() => open(p)}
              />
            ))}
          </div>
        ) : photos.length === 3 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:grid-rows-2">
            <MosaicCell
              photo={photos[0]}
              index={0}
              thumbWidth={1200}
              className="col-span-2 aspect-[16/10] md:col-span-2 md:row-span-2 md:min-h-[320px] md:aspect-auto"
              onOpen={() => open(photos[0])}
            />
            <MosaicCell
              photo={photos[1]}
              index={1}
              thumbWidth={700}
              className="col-span-1 aspect-square md:col-start-3 md:row-start-1"
              onOpen={() => open(photos[1])}
            />
            <MosaicCell
              photo={photos[2]}
              index={2}
              thumbWidth={700}
              className="col-span-1 aspect-square md:col-start-3 md:row-start-2"
              onOpen={() => open(photos[2])}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 md:grid-rows-2 md:gap-3">
            <MosaicCell
              photo={photos[0]}
              index={0}
              thumbWidth={1400}
              className="col-span-2 aspect-[16/11] md:col-span-2 md:row-span-2 md:min-h-[300px] lg:min-h-[360px] md:aspect-auto"
              onOpen={() => open(photos[0])}
            />
            {photos[1] ? (
              <MosaicCell
                photo={photos[1]}
                index={1}
                thumbWidth={720}
                className="col-span-1 aspect-square md:min-h-[168px]"
                onOpen={() => open(photos[1])}
              />
            ) : null}
            {photos[2] ? (
              <MosaicCell
                photo={photos[2]}
                index={2}
                thumbWidth={720}
                className="col-span-1 aspect-square md:min-h-[168px]"
                onOpen={() => open(photos[2])}
              />
            ) : null}
            {photos.length > 3 ? (
              <div className="col-span-2 grid grid-cols-2 gap-2 sm:gap-3 md:col-span-3 md:grid-cols-3">
                {photos.slice(3, 9).map((p, i) => (
                  <MosaicCell
                    key={p.id}
                    photo={p}
                    index={i + 3}
                    thumbWidth={640}
                    className="relative aspect-[4/3]"
                    onOpen={() => open(p)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}

        <ImageModal
          open={!!lightbox}
          onOpenChange={(o) => !o && setLightbox(null)}
          src={lightbox?.src ?? null}
          alt={lightbox?.alt ?? ''}
        />
      </div>
    </section>
  )
}
