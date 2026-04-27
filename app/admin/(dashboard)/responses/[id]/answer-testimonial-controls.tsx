'use client'

import { useState, useTransition } from 'react'
import { Quote, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  deleteTestimonial,
  shareAnswerAsTestimonial,
  updateTestimonial,
} from '@/lib/actions/testimonials'

export type ExistingTestimonial = {
  id: string
  attendeeName: string | null
  attendeeRole: string | null
  published: boolean
} | null

export function AnswerTestimonialControls ({
  responseId,
  blockId,
  initial,
  isAnswerEmpty,
}: {
  responseId: string
  blockId: string
  initial: ExistingTestimonial
  isAnswerEmpty: boolean
}) {
  const [existing, setExisting] = useState<ExistingTestimonial>(initial)
  const [name, setName] = useState(initial?.attendeeName ?? '')
  const [role, setRole] = useState(initial?.attendeeRole ?? '')
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleShare () {
    startTransition(async () => {
      try {
        const res = await shareAnswerAsTestimonial({
          responseId,
          blockId,
          attendeeName: name || undefined,
          attendeeRole: role || undefined,
        })
        setExisting({
          id: res.id,
          attendeeName: name || null,
          attendeeRole: role || null,
          published: true,
        })
        setOpen(false)
        toast.success(res.created ? 'Shared as testimonial' : 'Testimonial updated')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to share')
      }
    })
  }

  function handleSaveEdits () {
    if (!existing) return
    startTransition(async () => {
      try {
        await updateTestimonial({
          id: existing.id,
          attendeeName: name,
          attendeeRole: role,
        })
        setExisting({
          ...existing,
          attendeeName: name || null,
          attendeeRole: role || null,
        })
        setOpen(false)
        toast.success('Saved')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  function handleRemove () {
    if (!existing) return
    if (!confirm('Remove this answer from testimonials?')) return
    startTransition(async () => {
      try {
        await deleteTestimonial(existing.id)
        setExisting(null)
        setOpen(false)
        toast.success('Removed from testimonials')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove')
      }
    })
  }

  if (isAnswerEmpty && !existing) {
    return null
  }

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      {!open ? (
        <div className="flex flex-wrap items-center gap-2">
          {existing ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Quote className="size-3" />
                Shared as testimonial
                {!existing.published ? (
                  <span className="text-muted-foreground">(unpublished)</span>
                ) : null}
              </span>
              {existing.attendeeName ? (
                <span className="text-xs text-muted-foreground">— {existing.attendeeName}</span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setOpen(true)}
                disabled={pending}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleRemove}
                disabled={pending}
                className="text-destructive"
              >
                <Trash2 className="size-3" />
                Remove
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setOpen(true)}
              disabled={pending || isAnswerEmpty}
            >
              <Quote className="size-3" />
              Share as testimonial
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor={`name-${blockId}`}>
                Attendee name <span className="text-muted-foreground/70">(optional)</span>
              </label>
              <Input
                id={`name-${blockId}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor={`role-${blockId}`}>
                Role <span className="text-muted-foreground/70">(optional)</span>
              </label>
              <Input
                id={`role-${blockId}`}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Builder, Designer"
                disabled={pending}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={existing ? handleSaveEdits : handleShare}
              disabled={pending}
            >
              {pending
                ? 'Saving…'
                : existing
                  ? 'Save changes'
                  : 'Publish testimonial'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                setName(existing?.attendeeName ?? '')
                setRole(existing?.attendeeRole ?? '')
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            {!existing ? (
              <span className="text-xs text-muted-foreground">
                Will appear on the homepage Testimonials section.
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
