'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CopyPromptButton ({
  text,
  label,
}: {
  text: string
  label: string
}) {
  const [copied, setCopied] = useState(false)

  async function copyPrompt () {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copyPrompt}
      className="rounded-lg border-border/80 bg-background/50"
      aria-label={copied ? `${label} copied` : `Copy ${label} prompt`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy prompt'}
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} prompt copied to clipboard` : ''}
      </span>
    </Button>
  )
}
