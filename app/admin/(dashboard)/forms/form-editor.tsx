'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { nanoid } from 'nanoid'
import { saveForm } from '@/lib/actions/admin'
import { FormBuilder } from '@/components/form-builder'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
import type { FormDefinition } from '@/lib/forms/types'
import { ensureFormSlug } from '@/lib/forms/slug'

const emptyDef: FormDefinition = { blocks: [] }
const DEFAULT_TITLE = 'Untitled form'

export function FormEditor ({
  initial,
  aiEnabled,
  showAi = false,
}: {
  initial?: {
    id: string
    title: string
    slug: string
    status: 'draft' | 'published'
    definition: FormDefinition
  }
  aiEnabled: boolean
  showAi?: boolean
}) {
  const router = useRouter()
  const [initialSlug] = useState(() => initial?.slug ?? nanoid(10))
  const [title, setTitle] = useState(initial?.title ?? DEFAULT_TITLE)
  const [slug, setSlug] = useState(initialSlug)
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft')
  const [definition, setDefinition] = useState<FormDefinition>(initial?.definition ?? emptyDef)
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiPending, setAiPending] = useState(false)

  const hasMeaningfulContent =
    Boolean(initial?.id) ||
    definition.blocks.length > 0 ||
    title.trim() !== DEFAULT_TITLE ||
    slug.trim() !== initialSlug.trim()

  async function onSave () {
    setSaving(true)
    try {
      const res = await saveForm({
        id: initial?.id,
        title,
        slug,
        status,
        definition,
      })
      if (res?.slug) setSlug(res.slug)
      toast.success('Saved')
      if (!initial?.id && res?.id) router.push(`/admin/forms/${res.id}`)
      else router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function onGenerateDraft () {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setAiError('Describe the form you want to generate.')
      return
    }

    if (
      hasMeaningfulContent &&
      !window.confirm('Replace the current title, slug, and fields with a new AI-generated draft?')
    ) {
      return
    }

    setAiPending(true)
    setAiError(null)
    try {
      const res = await fetch('/api/agent/forms/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json().catch(() => ({})) as {
        error?: string
        draft?: {
          title: string
          slug: string
          definition: FormDefinition
        }
      }
      if (!res.ok || !data.draft) {
        throw new Error(data.error ?? 'Failed to generate a form draft.')
      }

      setTitle(data.draft.title)
      setSlug(ensureFormSlug(data.draft.slug, data.draft.title))
      setDefinition(data.draft.definition)
      toast.success('Draft generated')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate a form draft.'
      setAiError(message)
      toast.error(message)
    } finally {
      setAiPending(false)
    }
  }

  return (
    <div className="space-y-8">
      {showAi ? (
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI draft generator
            </CardTitle>
            <CardDescription>
              Describe the form you want, then review and save the generated draft manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Prompt</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={!aiEnabled || aiPending || saving}
                placeholder="Create an event registration form for a Kenya AI coding meetup with attendee name, email, experience level, and what they want to learn."
                className="min-h-[132px] border-border bg-background/60"
              />
            </div>
            {aiError ? (
              <p className="text-sm text-destructive">{aiError}</p>
            ) : !aiEnabled ? (
              <p className="text-sm text-muted-foreground">
                AI draft generation is unavailable until `OPENAI_API_KEY` is configured on the server.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Supported field types: short text, long text, and select. Generation replaces the current editor state after confirmation.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={!aiEnabled || aiPending || saving || !aiPrompt.trim()}
              onClick={onGenerateDraft}
            >
              <Sparkles className="h-4 w-4" />
              {aiPending ? 'Generating draft…' : 'Generate draft'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-border bg-background/60" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="border-border bg-background/60" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'published')}>
            <SelectTrigger className="border-border bg-background/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Fields</Label>
        <FormBuilder value={definition} onChange={setDefinition} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="w-full bg-gradient-to-r from-primary to-primary-end text-primary-foreground sm:w-auto"
        >
          {saving ? 'Saving…' : 'Save form'}
        </Button>
        {status === 'published' ? (
          <a
            href={`/forms/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}
          >
            Open public link
          </a>
        ) : null}
      </div>
    </div>
  )
}
