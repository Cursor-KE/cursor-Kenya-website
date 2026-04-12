'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { FormDefinition } from '@/lib/forms/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function FormRenderer ({
  definition,
  slug,
  onSubmitted,
}: {
  definition: FormDefinition
  slug: string
  onSubmitted?: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit (e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, answers: values }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
      onSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur-md"
      >
        <p className="text-lg font-medium text-foreground">Thanks — your response was recorded.</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {definition.blocks.map((block, i) => (
        <motion.div
          key={block.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="space-y-2"
        >
          <Label htmlFor={block.id} className="text-foreground">
            {block.label}
            {block.required ? <span className="text-destructive"> *</span> : null}
          </Label>
          {block.type === 'short_text' ? (
            <Input
              id={block.id}
              required={block.required}
              placeholder={block.placeholder}
              value={values[block.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [block.id]: e.target.value }))}
              className="border-border bg-background/60"
            />
          ) : null}
          {block.type === 'long_text' ? (
            <Textarea
              id={block.id}
              required={block.required}
              placeholder={block.placeholder}
              value={values[block.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [block.id]: e.target.value }))}
              className="min-h-[120px] border-border bg-background/60"
            />
          ) : null}
          {block.type === 'select' ? (
            <Select
              required={block.required}
              value={values[block.id] ?? ''}
              onValueChange={(val) =>
                setValues((v) => ({ ...v, [block.id]: val ?? '' }))
              }
            >
              <SelectTrigger className="border-border bg-background/60">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {block.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </motion.div>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        disabled={pending}
        className="bg-gradient-to-r from-primary to-primary-end text-primary-foreground shadow-[0_0_24px_-4px_var(--glow)] hover:opacity-95"
      >
        {pending ? 'Submitting…' : 'Submit'}
      </Button>
    </form>
  )
}
