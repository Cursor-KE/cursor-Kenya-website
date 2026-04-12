import { GalleryView } from '@/app/(marketing)/gallery/gallery-view'
import { FadeIn } from '@/components/motion-fade'
import { getAllImages, getAllVideos } from '@/lib/queries'

export const revalidate = 60

export default async function GalleryPage () {
  let photos: Awaited<ReturnType<typeof getAllImages>> = []
  let vids: Awaited<ReturnType<typeof getAllVideos>> = []
  try {
    photos = await getAllImages()
    vids = await getAllVideos()
  } catch {
    // database not configured
  }

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Gallery</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Photos from meetups and curated recordings — switch between photos and videos.
          </p>
        </FadeIn>
        <div className="mt-12">
          <GalleryView
            photos={photos.map((p) => ({
              id: p.id,
              secureUrl: p.secureUrl,
              alt: p.alt,
              width: p.width,
              height: p.height,
            }))}
            videos={vids.map((v) => ({
              id: v.id,
              youtubeVideoId: v.youtubeVideoId,
              title: v.title,
              description: v.description,
            }))}
          />
        </div>
      </div>
    </div>
  )
}
