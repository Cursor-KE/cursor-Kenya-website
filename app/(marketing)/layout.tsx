import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'

export default function MarketingLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
