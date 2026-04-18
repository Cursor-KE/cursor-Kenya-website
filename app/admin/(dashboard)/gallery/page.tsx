import { desc } from 'drizzle-orm'
import { AdminPageShell } from '@/components/admin-page-shell'
import { db } from '@/db'
import { images, videos } from '@/db/schema'
import { GalleryAdminClient } from '@/app/admin/(dashboard)/gallery/gallery-admin-client'

export default async function AdminGalleryPage () {
  const photoRows = await db.select().from(images).orderBy(desc(images.sortOrder))
  const videoRows = await db.select().from(videos).orderBy(desc(videos.sortOrder))

  return (
    <AdminPageShell
      title="Gallery"
      description="Upload photos to Cloudinary and curate YouTube videos."
    >
      <GalleryAdminClient photos={photoRows} videos={videoRows} />
    </AdminPageShell>
  )
}
