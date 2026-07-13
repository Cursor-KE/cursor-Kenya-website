'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { ArrowUpRight, Eye, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveRecapPost, type RecapActionState } from '@/lib/actions/recaps'
import { normalizeRecapSlug } from '@/lib/recaps/validation'

type RecapEditorValue = {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImageUrl: string
  status: 'draft' | 'published'
}

export function RecapEditor ({ initial }: { initial: RecapEditorValue }) {
  const initialActionState: RecapActionState = { ok: true, message: '' }
  const [state, action, pending] = useActionState(saveRecapPost, initialActionState)
  const [title, setTitle] = useState(initial.title)
  const [slug, setSlug] = useState(initial.slug)
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.slug))
  const publicSlug = slug || normalizeRecapSlug(title)

  return <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
    <input type="hidden" name="id" value={initial.id ?? state.id ?? ''} />
    <Card className="border-border/70 bg-card/65"><CardHeader><CardTitle>Story</CardTitle><CardDescription>Write in plain text with lightweight formatting for headings, lists, quotes, bold text, and inline code.</CardDescription></CardHeader><CardContent className="space-y-5">
      <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" value={title} onChange={(event) => { const next = event.target.value; setTitle(next); if (!slugEdited) setSlug(normalizeRecapSlug(next)) }} placeholder="What we learned at the Nairobi meetup" required /></div>
      <div className="space-y-2"><Label htmlFor="slug">Public URL</Label><div className="flex items-center rounded-lg border border-input bg-background/35 focus-within:ring-2 focus-within:ring-ring"><span className="pl-3 font-mono text-xs text-muted-foreground">/recaps/</span><Input id="slug" name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(normalizeRecapSlug(event.target.value)) }} className="border-0 bg-transparent pl-1 shadow-none focus-visible:ring-0" required /></div></div>
      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="excerpt">Summary</Label><span className="text-xs text-muted-foreground">Shown on recap cards</span></div><Textarea id="excerpt" name="excerpt" defaultValue={initial.excerpt} rows={3} maxLength={360} placeholder="A short, inviting summary of the gathering." required /></div>
      <div className="space-y-2"><Label htmlFor="content">Recap</Label><Textarea id="content" name="content" defaultValue={initial.content} className="min-h-[460px] resize-y font-mono text-sm leading-6" placeholder={'## The big idea\n\nWrite the story here.\n\n- A useful takeaway\n- Something the community built'} required /></div>
    </CardContent></Card>

    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <Card className="border-border/70 bg-card/65"><CardHeader><CardTitle>Publishing</CardTitle><CardDescription>Drafts are visible only inside the admin workspace.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="status">Visibility</Label><select id="status" name="status" defaultValue={initial.status} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="draft">Draft — private</option><option value="published">Published — public</option></select></div>{state.message ? <p role="status" className={state.ok ? 'rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300' : 'rounded-lg bg-destructive/10 p-3 text-sm text-destructive'}>{state.message}</p> : null}<Button type="submit" className="w-full" disabled={pending}>{pending ? 'Saving…' : <><Save /> Save recap</>}</Button>{state.ok && state.id && publicSlug ? <Link href={`/recaps/${publicSlug}`} target="_blank" className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><Eye className="size-4" />Open public page<ArrowUpRight className="size-3.5" /></Link> : null}</CardContent></Card>
      <Card className="border-border/70 bg-card/45"><CardHeader><CardTitle className="text-base">Formatting guide</CardTitle></CardHeader><CardContent className="space-y-2 font-mono text-xs text-muted-foreground"><p><span className="text-primary">##</span> Section heading</p><p><span className="text-primary">###</span> Smaller heading</p><p><span className="text-primary">-</span> Bullet item</p><p><span className="text-primary">1.</span> Numbered item</p><p><span className="text-primary">&gt;</span> Pull quote</p><p><span className="text-primary">**text**</span> Bold</p><p><span className="text-primary">`code`</span> Inline code</p></CardContent></Card>
      <Card className="border-border/70 bg-card/45"><CardHeader><CardTitle className="text-base">Cover image</CardTitle><CardDescription>Optional. Paste a hosted image URL.</CardDescription></CardHeader><CardContent><Input name="coverImageUrl" type="url" defaultValue={initial.coverImageUrl} placeholder="https://res.cloudinary.com/…" /></CardContent></Card>
    </aside>
  </form>
}
