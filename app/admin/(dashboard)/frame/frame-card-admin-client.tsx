'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { saveFrameCardSettings } from '@/lib/actions/admin'
import { FrameCardPreview } from '@/components/frame-card-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { FrameCardSettings } from '@/lib/frame-card/settings'

const MAX_TITLE_LENGTH = 80

export function FrameCardAdminClient ({
  settings,
}: {
  settings: FrameCardSettings
}) {
  const router = useRouter()
  const [title, setTitle] = useState(settings.title)
  const [published, setPublished] = useState(settings.published)
  const [saving, setSaving] = useState(false)

  async function onSubmit (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await saveFrameCardSettings({ title, published })
      router.refresh()
      toast.success('Frame card settings saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:items-start">
      <form onSubmit={(event) => void onSubmit(event)} className="rounded-xl border border-border bg-card/50 p-4 sm:p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="frame-title">Card title</Label>
            <Input
              id="frame-title"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="/Nairobi Meetup"
              className="border-border bg-background/60"
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/{MAX_TITLE_LENGTH} characters
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/45 p-3">
            <div>
              <Label htmlFor="frame-published" className="text-sm font-medium">
                Publish generator
              </Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                When on, regular users can open /getyourcard.
              </p>
            </div>
            <Switch id="frame-published" checked={published} onCheckedChange={setPublished} />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-primary to-primary-end text-primary-foreground"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>

      <section className="rounded-xl border border-border bg-card/35 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-foreground">Live preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This preview remains available to admins even when the public page is unpublished.
          </p>
        </div>
        <div className="mx-auto max-w-[560px]">
          <FrameCardPreview title={title} />
        </div>
      </section>
    </div>
  )
}
