'use client'

/**
 * Pixel-aligned meetup card renderer — ported from
 * https://github.com/Blackie360/Cursor-photobooth/blob/main/components/card-preview.tsx
 * (single locked Figma template + canvas title/hashtag/photo composite).
 */
import { BRAND } from '@/lib/brand'
import { forwardRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { DEFAULT_FRAME_CARD_TITLE } from '@/lib/frame-card/settings'
import { FRAME_CARD_HASHTAGS } from '@/lib/frame-card/hashtags'

const CARD_SIZE = 1024
const TEMPLATE_SRC = BRAND.assets.cardTemplate

const FRAME_X = 272
const FRAME_Y = 224
const FRAME_WIDTH = 480
const FRAME_HEIGHT = 574
const IMAGE_X = 275
const IMAGE_Y = 227
const IMAGE_WIDTH = 474
const IMAGE_HEIGHT = 568
const FRAME_STROKE = 'rgb(58, 47, 43)'
const FRAME_STROKE_WIDTH = 3
const TITLE_CENTER_X = 540
const TITLE_CENTER_Y = 123
const TITLE_MAX_WIDTH = 560
const TITLE_MASK_X = 260
const TITLE_MASK_Y = 86
const TITLE_MASK_WIDTH = 560
const TITLE_MASK_HEIGHT = 74
const TAGS_MASK_X = 196
const TAGS_MASK_Y = 860
const TAGS_MASK_WIDTH = 632
const TAGS_MASK_HEIGHT = 82
const TAGS_AREA_X = 204
const TAGS_AREA_Y = 860
const TAGS_AREA_WIDTH = 616
const TAG_HEIGHT = 34
const TAG_RADIUS = 6
const TAG_GAP_X = 12
const TAG_GAP_Y = 8
const TAG_PADDING_X = 12
const MASK_FILL = '#0a0a0a'
const TAG_FILL = '#201c2c'
const TAG_STROKE = 'rgba(132, 109, 192, 0.38)'
const TEXT_FILL = '#ffffff'
const FONT_FAMILY = '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif'

function loadImage (src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function fitText (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialSize: number, weight: number) {
  let fontSize = initialSize

  while (fontSize > 24) {
    ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`
    if (ctx.measureText(text).width <= maxWidth) break
    fontSize -= 2
  }

  ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`
}

function drawTitle (ctx: CanvasRenderingContext2D, title: string) {
  ctx.save()
  ctx.fillStyle = MASK_FILL
  ctx.fillRect(TITLE_MASK_X, TITLE_MASK_Y, TITLE_MASK_WIDTH, TITLE_MASK_HEIGHT)
  ctx.fillStyle = TEXT_FILL
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fitText(ctx, title, TITLE_MAX_WIDTH, 62, 600)
  ctx.fillText(title, TITLE_CENTER_X, TITLE_CENTER_Y)
  ctx.restore()
}

function drawHashtags (ctx: CanvasRenderingContext2D, hashtags: string[]) {
  ctx.save()
  ctx.fillStyle = MASK_FILL
  ctx.fillRect(TAGS_MASK_X, TAGS_MASK_Y, TAGS_MASK_WIDTH, TAGS_MASK_HEIGHT)
  ctx.font = `600 14px ${FONT_FAMILY}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  let cursorX = TAGS_AREA_X
  let cursorY = TAGS_AREA_Y

  for (const hashtag of hashtags) {
    const chipWidth = Math.ceil(ctx.measureText(hashtag).width) + TAG_PADDING_X * 2

    if (cursorX !== TAGS_AREA_X && cursorX + chipWidth > TAGS_AREA_X + TAGS_AREA_WIDTH) {
      cursorX = TAGS_AREA_X
      cursorY += TAG_HEIGHT + TAG_GAP_Y
    }

    if (cursorY + TAG_HEIGHT > TAGS_MASK_Y + TAGS_MASK_HEIGHT) break

    ctx.beginPath()
    ctx.roundRect(cursorX, cursorY, chipWidth, TAG_HEIGHT, TAG_RADIUS)
    ctx.fillStyle = TAG_FILL
    ctx.fill()
    ctx.strokeStyle = TAG_STROKE
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = TEXT_FILL
    ctx.fillText(hashtag, cursorX + TAG_PADDING_X, cursorY + TAG_HEIGHT / 2)

    cursorX += chipWidth + TAG_GAP_X
  }

  ctx.restore()
}

function drawCard (
  ctx: CanvasRenderingContext2D,
  templateImage: HTMLImageElement,
  uploadedImage: HTMLImageElement | null,
  title: string,
  hashtags: string[]
) {
  ctx.clearRect(0, 0, CARD_SIZE, CARD_SIZE)
  ctx.drawImage(templateImage, 0, 0, CARD_SIZE, CARD_SIZE)

  if (uploadedImage) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const imageAspect = uploadedImage.width / uploadedImage.height
    const frameAspect = IMAGE_WIDTH / IMAGE_HEIGHT

    let sourceX = 0
    let sourceY = 0
    let sourceWidth = uploadedImage.width
    let sourceHeight = uploadedImage.height

    if (imageAspect > frameAspect) {
      sourceWidth = uploadedImage.height * frameAspect
      sourceX = (uploadedImage.width - sourceWidth) / 2
    } else {
      sourceHeight = uploadedImage.width / frameAspect
      sourceY = (uploadedImage.height - sourceHeight) / 2
    }

    ctx.drawImage(
      uploadedImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      IMAGE_X,
      IMAGE_Y,
      IMAGE_WIDTH,
      IMAGE_HEIGHT
    )

    ctx.save()
    ctx.strokeStyle = FRAME_STROKE
    ctx.lineWidth = FRAME_STROKE_WIDTH
    ctx.strokeRect(FRAME_X, FRAME_Y, FRAME_WIDTH, FRAME_HEIGHT)
    ctx.restore()
  }

  drawTitle(ctx, title)
  drawHashtags(ctx, hashtags)
}

export type FrameCardPreviewProps = {
  title: string
  photoDataUrl?: string | null
  /** Defaults to `FRAME_CARD_HASHTAGS` — matches photobooth chip layout. */
  hashtags?: string[]
  className?: string
}

function FrameCardCanvasInner (
  { title, photoDataUrl, hashtags = FRAME_CARD_HASHTAGS, className }: FrameCardPreviewProps,
  ref: React.ForwardedRef<HTMLCanvasElement | null>
) {
  const displayTitle = title.trim() || DEFAULT_FRAME_CARD_TITLE

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const canvas = ref !== null && typeof ref !== 'function' ? ref.current : null
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = CARD_SIZE
      canvas.height = CARD_SIZE

      if (typeof document !== 'undefined' && 'fonts' in document) {
        await document.fonts.ready
      }

      const [templateImage, uploadedImage] = await Promise.all([
        loadImage(TEMPLATE_SRC),
        photoDataUrl ? loadImage(photoDataUrl).catch(() => null) : Promise.resolve(null),
      ])
      if (cancelled) return

      drawCard(ctx, templateImage, uploadedImage, displayTitle, hashtags)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [ref, displayTitle, photoDataUrl, hashtags])

  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-lg border border-border/70 bg-black shadow-2xl shadow-black/40',
        className
      )}
    >
      <canvas
        ref={ref}
        width={CARD_SIZE}
        height={CARD_SIZE}
        role="img"
        aria-label={`${displayTitle} attendance frame preview`}
        className="h-full w-full object-contain"
      />
    </div>
  )
}

export const FrameCardPreview = forwardRef<HTMLCanvasElement | null, FrameCardPreviewProps>(FrameCardCanvasInner)

FrameCardPreview.displayName = 'FrameCardPreview'
