'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Quote, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  deleteTestimonial,
  setTestimonialFeatured,
  setTestimonialPublished,
  updateTestimonial,
} from '@/lib/actions/testimonials'

export type AdminTestimonial = {
  id: string
  formId: string | null
  responseId: string | null
  question: string | null
  quote: string
  attendeeName: string | null
  attendeeRole: string | null
  published: boolean
  featured: boolean
  createdAt: string
}

export function TestimonialsAdminClient ({
  initial,
}: {
  initial: AdminTestimonial[]
}) {
  const [items, setItems] = useState(initial)

  function patchItem (id: string, patch: Partial<AdminTestimonial>) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function removeItem (id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 px-6 py-10 text-center">
        <Quote className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No testimonials yet. Open a form{' '}
          <Link href="/admin/responses" className="text-primary hover:underline">
            response
          </Link>{' '}
          and click <span className="font-medium text-foreground">Share as testimonial</span> on
          any answer.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <TestimonialRow
          key={item.id}
          item={item}
          onPatch={(patch) => patchItem(item.id, patch)}
          onRemove={() => removeItem(item.id)}
        />
      ))}
    </ul>
  )
}

function TestimonialRow ({
  item,
  onPatch,
  onRemove,
}: {
  item: AdminTestimonial
  onPatch: (patch: Partial<AdminTestimonial>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.attendeeName ?? '')
  const [role, setRole] = useState(item.attendeeRole ?? '')
  const [question, setQuestion] = useState(item.question ?? '')
  const [quote, setQuote] = useState(item.quote)
  const [pending, startTransition] = useTransition()

  function togglePublished (next: boolean) {
    startTransition(async () => {
      try {
        await setTestimonialPublished(item.id, next)
        onPatch({ published: next })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  function toggleFeatured (next: boolean) {
    startTransition(async () => {
      try {
        await setTestimonialFeatured(item.id, next)
        onPatch({ featured: next })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  function handleSave () {
    startTransition(async () => {
      try {
        await updateTestimonial({
          id: item.id,
          attendeeName: name,
          attendeeRole: role,
          question,
          quote,
        })
        onPatch({
          attendeeName: name || null,
          attendeeRole: role || null,
          question: question || null,
          quote: quote.trim(),
        })
        setEditing(false)
        toast.success('Saved')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  function handleDelete () {
    if (!confirm('Delete this testimonial?')) return
    startTransition(async () => {
      try {
        await deleteTestimonial(item.id)
        onRemove()
        toast.success('Deleted')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  return (
    <li className="rounded-xl border border-border bg-card/50 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Created {new Date(item.createdAt).toLocaleString()}</span>
          {item.responseId ? (
            <Link
              href={`/admin/responses/${item.responseId}`}
              className="text-primary hover:underline"
            >
              View source response
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={item.published}
              onCheckedChange={togglePublished}
              disabled={pending}
              size="sm"
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={item.featured}
              onCheckedChange={toggleFeatured}
              disabled={pending}
              size="sm"
            />
            <Star className="size-3" />
            Featured
          </label>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Question / prompt</label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What did you enjoy most?"
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Testimonial</label>
            <Textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={3}
              disabled={pending}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Attendee name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Builder, Designer"
                disabled={pending}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false)
                setName(item.attendeeName ?? '')
                setRole(item.attendeeRole ?? '')
                setQuestion(item.question ?? '')
                setQuote(item.quote)
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {item.question ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.question}
            </p>
          ) : null}
          <blockquote className="border-l-2 border-primary/40 pl-3 text-sm text-foreground">
            “{item.quote}”
          </blockquote>
          <p className="text-xs text-muted-foreground">
            {item.attendeeName ? <span className="text-foreground">{item.attendeeName}</span> : 'Anonymous attendee'}
            {item.attendeeRole ? ` · ${item.attendeeRole}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" size="xs" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={handleDelete}
              disabled={pending}
              className="text-destructive"
            >
              <Trash2 className="size-3" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
