import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { getPublishedFrameCardSettings } from '@/lib/queries'

export default async function MarketingLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  const frameCardSettings = await getPublishedFrameCardSettings()
  const showFrameLink = frameCardSettings != null

  return (
    <>
      <Navbar showFrameLink={showFrameLink} />
      <main className="flex-1">{children}</main>
      <Footer showFrameLink={showFrameLink} />
    </>
  )
}
