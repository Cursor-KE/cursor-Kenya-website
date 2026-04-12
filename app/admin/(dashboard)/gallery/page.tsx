import { desc } from 'drizzle-orm'
import { db } from '@/db'
import { images, videos } from '@/db/schema'
import { GalleryAdminClient } from '@/app/admin/(dashboard)/gallery/gallery-admin-client'

export default async function AdminGalleryPage () {
  const photoRows = await db.select().from(images).orderBy(desc(images.sortOrder))
  const videoRows = await db.select().from(videos).orderBy(desc(videos.sortOrder))

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Gallery</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload photos to Cloudinary and curate YouTube videos.
      </p>
      <GalleryAdminClient photos={photoRows} videos={videoRows} />
    </div>
  )
}
