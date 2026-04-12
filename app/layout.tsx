import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Cursor Kenya',
    template: '%s | Cursor Kenya',
  },
  description:
    'Nairobi developer community for Cursor and AI-assisted coding — events, gallery, and meetups.',
  openGraph: {
    title: 'Cursor Kenya',
    description: 'Developer community for AI-assisted coding in Nairobi.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cursor Kenya',
    description: 'Developer community for AI-assisted coding in Nairobi.',
  },
}

export default function RootLayout ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
