'use client'

import { BRAND } from '@/lib/brand'

import { useRef, useState } from 'react'
import { Download, ImagePlus, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FrameCardPreview } from '@/components/frame-card-preview'

const OUTPUT_FILENAME = BRAND.cardFilename

function readFileAsDataUrl (file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read selected image.'))
    }
    reader.onerror = () => reject(new Error('Could not read selected image.'))
    reader.readAsDataURL(file)
  })
}

function dataUrlToFile (dataUrl: string): File {
  const [header, base64 = ''] = dataUrl.split(',')
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], OUTPUT_FILENAME, { type: mime })
}

export function FrameCardGenerator ({
  title,
}: {
  title: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onPick (event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.')
      return
    }

    try {
      setPhotoDataUrl(await readFileAsDataUrl(file))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read selected image.')
    }
  }

  function createPngDataUrl (): string {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('Card preview is not ready.')
    return canvas.toDataURL('image/png')
  }

  async function downloadCard () {
    if (!photoDataUrl || busy) return
    setBusy(true)
    try {
      const dataUrl = createPngDataUrl()
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = OUTPUT_FILENAME
      link.click()
      toast.success('Card downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download card.')
    } finally {
      setBusy(false)
    }
  }

  async function shareCard () {
    if (!photoDataUrl || busy) return
    setBusy(true)
    try {
      const dataUrl = createPngDataUrl()
      const file = dataUrlToFile(dataUrl)
      const shareData = {
        files: [file],
        title: `${BRAND.name} meetup card`,
        text: `I am attending ${BRAND.name}.`,
      }

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = OUTPUT_FILENAME
        link.click()
        toast.message('Sharing is not supported here, so the card was downloaded instead.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error(error instanceof Error ? error.message : 'Could not share card.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="mx-auto w-full max-w-[620px]">
        <FrameCardPreview ref={canvasRef} title={title} photoDataUrl={photoDataUrl} />
      </div>

      <section className="rounded-xl border border-border bg-card/55 p-4 shadow-lg shadow-black/10">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choose your photo"
          onChange={(event) => void onPick(event)}
        />
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">Your photo</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Pick a square or portrait image for the center frame. The image stays in your browser.
            </p>
          </div>

          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {photoDataUrl ? 'Replace photo' : 'Upload photo'}
            </Button>
            {photoDataUrl ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center text-muted-foreground"
                disabled={busy}
                onClick={() => setPhotoDataUrl(null)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove photo
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 border-t border-border pt-4">
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-primary to-primary-end text-primary-foreground"
              disabled={!photoDataUrl || busy}
              onClick={() => void downloadCard()}
            >
              <Download className="mr-2 h-4 w-4" />
              {busy ? 'Preparing...' : 'Download PNG'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!photoDataUrl || busy}
              onClick={() => void shareCard()}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share image
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
