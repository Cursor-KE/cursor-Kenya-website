'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type UploadedImagePayload = {
  publicId: string
  secureUrl: string
  width?: number
  height?: number
}

type UploadWidgetProps = {
  onUploaded: (payload: UploadedImagePayload) => void | Promise<void>
  /** Called once after the batch finishes (after all per-file uploads / saves). */
  onBatchComplete?: () => void | Promise<void>
  className?: string
}

type StagedItem = {
  id: string
  file: File
  previewUrl: string
}

const UPLOAD_TOAST = 'gallery-upload'
const UPLOAD_RESULT_TOAST_DURATION = 5000
const UPLOAD_WARNING_TOAST_DURATION = 8000

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|svg|avif|heic|heif)$/i

/** Browsers often leave `File.type` empty (Windows / some phones) — still allow likely images. */
function isLikelyImageFile (f: File) {
  if (f.type && f.type.startsWith('image/')) return true
  if (f.type && f.type !== 'application/octet-stream') return false
  return IMAGE_EXT_RE.test(f.name)
}

function parseCloudinaryError (responseText: string): string {
  try {
    const j = JSON.parse(responseText) as { error?: { message?: string } }
    const m = j.error?.message
    if (m) return m
  } catch {
    // ignore
  }
  if (responseText.length > 0 && responseText.length < 200) return responseText
  return 'Upload failed'
}

function errorMessage (err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return String(err)
}

async function uploadOneImage (
  file: File,
  fileIndex: number,
  totalFiles: number,
  setProgress: (n: number) => void
): Promise<UploadedImagePayload> {
  const signRes = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!signRes.ok) {
    const t = await signRes.text()
    throw new Error(
      signRes.status === 503
        ? 'Cloudinary is not configured (check server env).'
        : `Signing failed (${signRes.status}): ${t.slice(0, 120)}`
    )
  }
  const { cloudName, apiKey, timestamp, signature, folder } = await signRes.json()

  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', apiKey)
  fd.append('timestamp', String(timestamp))
  fd.append('signature', signature)
  fd.append('folder', folder)

  const fileWeight = 100 / totalFiles
  const base = (fileIndex / totalFiles) * 100
  setProgress(Math.min(99, Math.round(base + 2)))

  return await new Promise<UploadedImagePayload>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const p = base + (ev.loaded / ev.total) * fileWeight
        setProgress(Math.min(99, Math.round(p)))
      }
    }
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(parseCloudinaryError(xhr.responseText)))
        return
      }
      try {
        const data = JSON.parse(xhr.responseText) as {
          public_id: string
          secure_url: string
          width?: number
          height?: number
        }
        resolve({
          publicId: data.public_id,
          secureUrl: data.secure_url,
          width: data.width,
          height: data.height,
        })
      } catch {
        reject(new Error('Invalid upload response from Cloudinary'))
      }
    }
    xhr.onerror = () => reject(new Error('Network error while uploading'))
    xhr.send(fd)
  })
}

export function UploadWidget ({ onUploaded, onBatchComplete, className }: UploadWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const stagedRef = useRef<StagedItem[]>([])
  const [staged, setStaged] = useState<StagedItem[]>([])
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [statusLine, setStatusLine] = useState('')

  stagedRef.current = staged

  useEffect(() => () => {
    stagedRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl))
  }, [])

  function removeOne (id: string) {
    setStaged((prev) => {
      const item = prev.find((s) => s.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((s) => s.id !== id)
    })
  }

  function clearAll () {
    setStaged((prev) => {
      prev.forEach((s) => URL.revokeObjectURL(s.previewUrl))
      return []
    })
  }

  function onPick (e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const list = input.files
    const raw = list?.length ? Array.from(list) : []
    input.value = ''
    if (!raw.length) return

    const newFiles = raw.filter(isLikelyImageFile)
    if (!newFiles.length) {
      toast.error('No image files recognized', {
        description:
          raw.length === 1
            ? `"${raw[0]?.name}" did not look like an image (try PNG, JPEG, or WebP).`
            : `${raw.length} file(s) were not recognized as images.`,
      })
      return
    }
    if (newFiles.length < raw.length) {
      toast.message(`Added ${newFiles.length} of ${raw.length} image(s)`, {
        description: 'Some files were skipped (unsupported type or extension).',
      })
    }

    setStaged((prev) => {
      const extra: StagedItem[] = newFiles.map((file) => ({
        id: nanoid(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      return [...prev, ...extra]
    })
  }

  async function startUpload () {
    const items = [...staged]
    if (!items.length) return

    setBusy(true)
    setProgress(0)
    setStatusLine('')

    toast.loading(
      items.length === 1 ? 'Uploading image…' : `Uploading 0 / ${items.length}…`,
      { id: UPLOAD_TOAST, duration: Infinity }
    )

    let ok = 0
    let failed = 0
    let lastError: string | null = null

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        setStatusLine(`Uploading ${i + 1} of ${items.length}…`)
        toast.loading(
          items.length === 1 ? 'Uploading image…' : `Uploading ${i + 1} / ${items.length}…`,
          { id: UPLOAD_TOAST, duration: Infinity }
        )

        try {
          const payload = await uploadOneImage(item.file, i, items.length, setProgress)
          await Promise.resolve(onUploaded(payload))
          ok += 1
          removeOne(item.id)
        } catch (err) {
          console.error('Upload or save failed:', item.file.name, err)
          failed += 1
          lastError = errorMessage(err)
        }
      }

      setProgress(100)

      toast.dismiss(UPLOAD_TOAST)

      if (ok > 0 && failed === 0) {
        toast.success(ok === 1 ? 'Image saved to gallery' : `${ok} images saved to gallery`, {
          duration: UPLOAD_RESULT_TOAST_DURATION,
          dismissible: true,
        })
      } else if (ok > 0 && failed > 0) {
        toast.warning(`${ok} saved, ${failed} failed`, {
          duration: UPLOAD_WARNING_TOAST_DURATION,
          dismissible: true,
          description: lastError ?? undefined,
        })
      } else if (failed > 0) {
        toast.error(lastError ?? 'Upload or save failed', {
          duration: 12000,
          description:
            items.length > 1
              ? `${failed} file(s) failed. Check the database connection and that you are signed in.`
              : 'Check Cloudinary env vars, database, and that you are signed in.',
        })
      }

      try {
        await Promise.resolve(onBatchComplete?.())
      } catch (err) {
        console.error(err)
        toast.error(errorMessage(err), { description: 'Could not refresh the page list.' })
      }
    } finally {
      setBusy(false)
      setProgress(0)
      setStatusLine('')
    }
  }

  const hasStaged = staged.length > 0
  const idle = !busy

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        aria-label="Select images to upload"
        onChange={onPick}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!idle}
          className="border-dashed border-border"
          onClick={() => inputRef.current?.click()}
        >
          {hasStaged ? (
            <>
              <ImagePlus className="mr-2 h-4 w-4" />
              Add images
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Choose images
            </>
          )}
        </Button>
        {hasStaged ? (
          <>
            <Button
              type="button"
              variant="default"
              disabled={!idle}
              className="bg-gradient-to-r from-primary to-primary-end text-primary-foreground"
              onClick={() => void startUpload()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload {staged.length === 1 ? '1 image' : `${staged.length} images`}
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled={!idle} onClick={clearAll} aria-label="Clear selection">
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>

      {hasStaged ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {staged.map((item) => (
            <li
              key={item.id}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-border bg-muted/30',
                !idle && 'pointer-events-none opacity-60'
              )}
            >
              {/* Object URLs are not supported by next/image without extra config */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-2 pt-8">
                <p className="truncate text-xs text-foreground" title={item.file.name}>
                  {item.file.name}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full shadow-md"
                disabled={!idle}
                onClick={() => removeOne(item.id)}
                aria-label={`Remove ${item.file.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Pick images to see a preview, then upload.</p>
      )}

      {busy ? (
        <div className="space-y-1">
          {statusLine ? (
            <p className="text-xs text-muted-foreground">{statusLine}</p>
          ) : null}
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs tabular-nums text-muted-foreground">{progress}%</p>
        </div>
      ) : null}
    </div>
  )
}
