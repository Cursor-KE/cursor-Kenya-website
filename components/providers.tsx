'use client'

import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'

export function Providers ({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
      <TooltipProvider>
        {children}
        <Toaster
          richColors
          position="top-center"
          theme="dark"
          className="z-[10000]"
          toastOptions={{ className: 'z-[10000]' }}
        />
      </TooltipProvider>
    </ThemeProvider>
  )
}
