import { BRAND } from '@/lib/brand'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FrameCardGenerator } from '@/components/frame-card-generator'
import { getPublishedFrameCardSettings } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Get your card',
  description: `Create and share your ${BRAND.name} meetup attendance card.`,
}

export const dynamic = 'force-dynamic'

export default async function GetYourCardPage () {
  const settings = await getPublishedFrameCardSettings()
  if (!settings) notFound()

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Get your card
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Add your photo to the {BRAND.name} meetup frame, then download or share the image.
          </p>
        </div>
        <FrameCardGenerator title={settings.title} />
      </div>
    </section>
  )
}
