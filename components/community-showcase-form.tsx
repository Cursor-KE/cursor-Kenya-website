'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { submitCommunityShowcase } from '@/lib/actions/showcase'
import type { UploadedImagePayload } from '@/components/upload-widget'
import { UploadWidget } from '@/components/upload-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'

export function CommunityShowcaseForm () {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [builderName, setBuilderName] = useState('')
  const [builderEmail, setBuilderEmail] = useState('')
  const [shots, setShots] = useState<UploadedImagePayload[]>([])

  function onUploaded (payload: UploadedImagePayload) {
    setShots((prev) => {
      if (prev.length >= 8) return prev
      return [...prev, payload]
    })
  }

  function removeShot (index: number) {
    setShots((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit (e: React.FormEvent) {
    e.preventDefault()
    if (shots.length < 2) {
      toast.error('Add at least two product screenshots.')
      return
    }
    startTransition(async () => {
      const result = await submitCommunityShowcase({
        title,
        description,
        projectUrl,
        repoUrl: repoUrl || undefined,
        builderName,
        builderEmail,
        screenshotUrls: shots.map((s) => s.secureUrl),
      })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success('Thanks! Your project is pending review.')
      setTitle('')
      setDescription('')
      setProjectUrl('')
      setRepoUrl('')
      setBuilderName('')
      setBuilderEmail('')
      setShots([])
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="cs-title">Project title</Label>
        <Input
          id="cs-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="e.g. Nairobi transit map"
          className="border-border bg-background/60"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-desc">What did you build with Cursor?</Label>
        <Textarea
          id="cs-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          maxLength={8000}
          placeholder="Short description of the project and how Cursor helped."
          className="border-border bg-background/60"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cs-url">Live or demo URL</Label>
          <Input
            id="cs-url"
            type="url"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            required
            placeholder="https://"
            className="border-border bg-background/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs-repo">Repository (optional)</Label>
          <Input
            id="cs-repo"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/..."
            className="border-border bg-background/60"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cs-name">Your name</Label>
          <Input
            id="cs-name"
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
            required
            maxLength={120}
            className="border-border bg-background/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs-email">Email</Label>
          <Input
            id="cs-email"
            type="email"
            autoComplete="email"
            value={builderEmail}
            onChange={(e) => setBuilderEmail(e.target.value)}
            required
            className="border-border bg-background/60"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Screenshots (minimum 2, max 8)</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload clear images of your product. Same Cloudinary flow as the gallery.
          </p>
        </div>
        {shots.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {shots.map((s, i) => (
              <li
                key={`${s.publicId}-${i}`}
                className="relative h-24 w-36 overflow-hidden rounded-lg border border-border bg-muted"
              >
                <Image
                  src={cloudinaryScaledUrl(s.secureUrl, 280)}
                  alt=""
                  width={280}
                  height={160}
                  className="h-full w-full object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-md bg-background/90 p-1 shadow hover:bg-background"
                  onClick={() => removeShot(i)}
                  aria-label="Remove screenshot"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {shots.length < 8 ? (
          <UploadWidget
            onUploaded={onUploaded}
            onBatchComplete={() => router.refresh()}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Maximum eight screenshots reached.</p>
        )}
        {shots.length > 0 && shots.length < 2 ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">Add at least one more screenshot.</p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={pending || shots.length < 2}
        className="w-full bg-gradient-to-r from-primary to-primary-end text-primary-foreground sm:w-auto"
      >
        {pending ? 'Submitting…' : 'Submit for review'}
      </Button>
    </form>
  )
}
