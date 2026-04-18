'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { nanoid } from 'nanoid'
import { saveForm } from '@/lib/actions/admin'
import { FormBuilder } from '@/components/form-builder'
import { Button, buttonVariants } from '@/components/ui/button'
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
import type { FormDefinition } from '@/lib/forms/types'

const emptyDef: FormDefinition = { blocks: [] }

export function FormEditor ({
  initial,
}: {
  initial?: {
    id: string
    title: string
    slug: string
    status: 'draft' | 'published'
    definition: FormDefinition
  }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? 'Untitled form')
  const [slug, setSlug] = useState(initial?.slug ?? nanoid(10))
  const [status, setStatus] = useState<'draft' | 'published'>(initial?.status ?? 'draft')
  const [definition, setDefinition] = useState<FormDefinition>(initial?.definition ?? emptyDef)
  const [saving, setSaving] = useState(false)

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
      toast.success('Saved')
      if (!initial?.id && res?.id) router.push(`/admin/forms/${res.id}`)
      else router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
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
