import { desc } from 'drizzle-orm'
import { AdminPageShell } from '@/components/admin-page-shell'
import { db } from '@/db'
import { images, videos } from '@/db/schema'
import { GalleryAdminClient } from '@/app/admin/(dashboard)/gallery/gallery-admin-client'

async function AdminGalleryContent () {
  const [photoRows, videoRows] = await Promise.all([
    db.select().from(images).orderBy(desc(images.sortOrder)),
    db.select().from(videos).orderBy(desc(videos.sortOrder)),
  ])

  return <GalleryAdminClient photos={photoRows} videos={videoRows} />
}

export default async function AdminGalleryPage () {
  return (
    <AdminPageShell
      title="Gallery"
      description="Upload photos to Cloudinary and curate YouTube videos."
    >
      {await AdminGalleryContent()}
    </AdminPageShell>
  )
}
