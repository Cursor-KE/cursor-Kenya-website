'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { submitCommunityShowcase } from '@/lib/actions/showcase'
import {
  SHOWCASE_PROJECT_KIND_LABELS,
  SHOWCASE_PROJECT_KIND_VALUES,
  type ShowcaseProjectKind,
} from '@/lib/showcase/project-kind'
import {
  SHOWCASE_DESC_MAX,
  SHOWCASE_DESC_MAX_WORDS,
  SHOWCASE_DESC_MIN,
  SHOWCASE_DESC_MIN_WORDS,
  countWords,
  getDescriptionFieldError,
} from '@/lib/showcase/validation'
import { cn } from '@/lib/utils'
import type { UploadedImagePayload } from '@/components/upload-widget'
import { UploadWidget } from '@/components/upload-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'

export function CommunityShowcaseForm () {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [projectKind, setProjectKind] = useState<ShowcaseProjectKind | ''>('')
  const [description, setDescription] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [builderName, setBuilderName] = useState('')
  const [builderEmail, setBuilderEmail] = useState('')
  const [shots, setShots] = useState<UploadedImagePayload[]>([])
  const [descBlurred, setDescBlurred] = useState(false)

  const descriptionError = useMemo(() => {
    const t = description.trim()
    if (t.length === 0) {
      return descBlurred ? 'Enter a short description.' : null
    }
    return getDescriptionFieldError(description)
  }, [description, descBlurred])

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
    if (!projectKind) {
      toast.error('Choose what type of project this is.')
      return
    }
    if (description.trim().length === 0) {
      setDescBlurred(true)
      toast.error('Enter a short description.')
      return
    }
    const descErr = getDescriptionFieldError(description)
    if (descErr) {
      setDescBlurred(true)
      toast.error(descErr)
      return
    }
    if (shots.length < 2) {
      toast.error('Add at least two product screenshots.')
      return
    }
    startTransition(async () => {
      const result = await submitCommunityShowcase({
        title,
        projectKind,
        description,
        projectUrl,
        repoUrl: repoUrl || undefined,
        builderName,
        builderEmail,
        screenshotUrls: shots.map((s) => s.secureUrl),
      })
      if (!result.ok) {
        toast.error(result.message)
        if (/description|word|character/i.test(result.message)) {
          setDescBlurred(true)
        }
        return
      }
      toast.success('Thanks! Your project is pending review.')
      setTitle('')
      setProjectKind('')
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
        <Label htmlFor="cs-kind">What kind of build is this?</Label>
        <Select
          required
          value={projectKind}
          onValueChange={(v) => setProjectKind(v as ShowcaseProjectKind)}
        >
          <SelectTrigger id="cs-kind" className="h-9 w-full border-border bg-background/60">
            <SelectValue placeholder="Select type…" />
          </SelectTrigger>
          <SelectContent>
            {SHOWCASE_PROJECT_KIND_VALUES.map((k) => (
              <SelectItem key={k} value={k}>
                {SHOWCASE_PROJECT_KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Shown on the public showcase so visitors can filter by SaaS, portfolio, and more.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-desc">What did you build with Cursor?</Label>
        <Textarea
          id="cs-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setDescBlurred(true)}
          required
          rows={4}
          maxLength={SHOWCASE_DESC_MAX}
          placeholder="Short description of the project and how Cursor helped."
          aria-invalid={descriptionError != null}
          aria-describedby={
            descriptionError != null ? 'cs-desc-hint cs-desc-error' : 'cs-desc-hint'
          }
          className={cn(
            'bg-background/60',
            descriptionError != null ? 'border-destructive' : 'border-border'
          )}
        />
        <p
          id="cs-desc-hint"
          className={cn(
            'text-xs tabular-nums',
            descriptionError != null ? 'text-destructive/90' : 'text-muted-foreground'
          )}
        >
          {countWords(description)}/{SHOWCASE_DESC_MAX_WORDS} words · {description.length}/{SHOWCASE_DESC_MAX}{' '}
          characters (min {SHOWCASE_DESC_MIN_WORDS} words, {SHOWCASE_DESC_MIN} characters)
        </p>
        {descriptionError != null ? (
          <p id="cs-desc-error" role="alert" className="text-xs text-destructive">
            {descriptionError}
          </p>
        ) : null}
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
            kind="showcase"
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
