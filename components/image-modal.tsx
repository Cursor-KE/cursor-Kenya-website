'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ImageModal ({
  open,
  onOpenChange,
  src,
  alt,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  src: string | null
  alt: string
}) {
  if (!src) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[95vh] max-w-[min(96vw,1200px)] border-border bg-background/95 p-0 backdrop-blur-xl"
      >
        <DialogTitle className="sr-only">{alt || 'Image'}</DialogTitle>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 rounded-full bg-background/80 text-foreground hover:bg-background"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex max-h-[85vh] items-center justify-center p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain" />
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
