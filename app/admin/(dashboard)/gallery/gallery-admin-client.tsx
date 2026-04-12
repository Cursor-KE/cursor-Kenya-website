'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteImage, deleteVideo, saveImageRecord, saveVideo } from '@/lib/actions/admin'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import { UploadWidget } from '@/components/upload-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { images, videos } from '@/db/schema'

type Photo = typeof images.$inferSelect
type Video = typeof videos.$inferSelect

export function GalleryAdminClient ({
  photos,
  videos: videoRows,
}: {
  photos: Photo[]
  videos: Video[]
}) {
  const router = useRouter()
  const [ytId, setYtId] = useState('')
  const [ytTitle, setYtTitle] = useState('')
  const [ytFeat, setYtFeat] = useState(false)

  async function onUploaded (payload: {
    publicId: string
    secureUrl: string
    width?: number
    height?: number
  }) {
    const result = await saveImageRecord({
      publicId: payload.publicId,
      secureUrl: payload.secureUrl,
      alt: '',
      width: payload.width,
      height: payload.height,
    })
    if (!result.ok) {
      throw new Error(result.message)
    }
  }

  function onUploadBatchComplete () {
    router.refresh()
  }

  async function addVideo (e: React.FormEvent) {
    e.preventDefault()
    if (!ytId.trim()) return
    try {
      await saveVideo({
        youtubeVideoId: ytId.trim(),
        title: ytTitle || undefined,
        featured: ytFeat,
      })
      setYtId('')
      setYtTitle('')
      setYtFeat(false)
      router.refresh()
      toast.success('Video added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div className="mt-8 space-y-12">
      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="text-lg font-medium text-foreground">Upload images</h2>
        <p className="mt-1 text-sm text-muted-foreground">Images are stored on Cloudinary and listed on the public gallery.</p>
        <div className="mt-4">
          <UploadWidget onUploaded={onUploaded} onBatchComplete={onUploadBatchComplete} />
        </div>
        <ul className="mt-6 space-y-2">
          {photos.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm"
            >
              <a
                href={p.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted ring-offset-background transition hover:opacity-95 hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Open full size"
              >
                <Image
                  src={cloudinaryScaledUrl(p.secureUrl, 160)}
                  alt={p.alt || p.publicId}
                  width={160}
                  height={160}
                  sizes="80px"
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-muted-foreground" title={p.publicId}>
                  {p.publicId}
                </p>
                {p.width != null && p.height != null ? (
                  <p className="mt-0.5 text-xs text-muted-foreground/80">
                    {p.width} × {p.height}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={async () => {
                  try {
                    await deleteImage(p.id)
                    router.refresh()
                    toast.success('Removed')
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed')
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card/50 p-6">
        <h2 className="text-lg font-medium text-foreground">YouTube videos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Paste a video ID (from youtube.com/watch?v=...).</p>
        <form onSubmit={addVideo} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="yt">Video ID</Label>
            <Input
              id="yt"
              value={ytId}
              onChange={(e) => setYtId(e.target.value)}
              placeholder="e.g. dQw4w9WgXcQ"
              className="border-border bg-background/60"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="ytt">Title (optional)</Label>
            <Input
              id="ytt"
              value={ytTitle}
              onChange={(e) => setYtTitle(e.target.value)}
              className="border-border bg-background/60"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="ytf" checked={ytFeat} onCheckedChange={setYtFeat} />
            <Label htmlFor="ytf">Featured</Label>
          </div>
          <Button type="submit" className="bg-gradient-to-r from-primary to-primary-end text-primary-foreground">
            Add video
          </Button>
        </form>
        <ul className="mt-6 space-y-2">
          {videoRows.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm"
            >
              <span className="truncate text-foreground">
                {v.title ?? v.youtubeVideoId}{' '}
                {v.featured ? (
                  <span className="ml-2 rounded-md bg-primary/20 px-1.5 py-0.5 text-xs text-primary">featured</span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    await deleteVideo(v.id)
                    router.refresh()
                    toast.success('Removed')
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed')
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
