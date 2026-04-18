'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertTriangle, Bot, ChevronDown, ChevronUp, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteShowcase,
  swapShowcaseOrder,
  toggleShowcaseFeatured,
  updateShowcaseStatus,
} from '@/lib/actions/showcase'
import type { ShowcaseSavedReview, ShowcaseReviewResult } from '@/lib/ai/showcase-review-schema'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { communityShowcase } from '@/db/schema'

type Row = typeof communityShowcase.$inferSelect

function recommendationVariant (
  recommendation: ShowcaseReviewResult['recommendation']
): 'default' | 'secondary' | 'destructive' {
  if (recommendation === 'approve') return 'default'
  if (recommendation === 'reject') return 'destructive'
  return 'secondary'
}

function signalSummary (review: ShowcaseSavedReview) {
  const signals = review.validationSignals
  const issues: string[] = []
  if (!signals.titleLengthOk) issues.push('Title length')
  if (!signals.descriptionLengthOk) issues.push('Description length')
  if (!signals.descriptionWordCountOk) issues.push('Description words')
  if (!signals.builderNameLengthOk) issues.push('Builder name')
  if (!signals.projectUrlOk) issues.push('Project URL')
  if (!signals.repoUrlOk) issues.push('Repo URL')
  if (!signals.screenshotCountOk) issues.push('Screenshots')
  if (signals.duplicateScreenshots) issues.push('Duplicate screenshots')
  return issues
}

export function ShowcaseAdminClient ({
  rows,
  aiEnabled,
  initialReviews,
}: {
  rows: Row[]
  aiEnabled: boolean
  initialReviews: Record<string, ShowcaseSavedReview>
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(() => new Set())
  const [batchReviewing, setBatchReviewing] = useState(false)
  const [reviews, setReviews] = useState<Record<string, ShowcaseSavedReview>>(initialReviews)
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({})

  async function run (id: string, fn: () => Promise<void>) {
    setBusyId(id)
    try {
      await fn()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  async function reviewWithAi (id: string, autoApply = false) {
    setReviewingIds((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      return next
    })
    setReviewErrors((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })

    try {
      const res = await fetch('/api/agent/showcase-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showcaseId: id, autoApply }),
      })
      const payload = await res.json() as { error?: string; result?: ShowcaseSavedReview }
      if (!res.ok || !payload.result) {
        throw new Error(payload.error || 'Failed to review this submission.')
      }
      const result = payload.result
      setReviews((current) => ({
        ...current,
        [id]: result,
      }))
      if (result.autoAction?.success) {
        toast.success('AI auto-approved this submission.')
        router.refresh()
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to review this submission.'
      setReviewErrors((current) => ({ ...current, [id]: message }))
      toast.error(message)
    } finally {
      setReviewingIds((current) => {
        if (!current.has(id)) return current
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }

  async function reviewPendingBatch () {
    setBatchReviewing(true)
    try {
      const res = await fetch('/api/agent/showcase-review/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      })
      const payload = await res.json() as {
        error?: string
        results?: ShowcaseSavedReview[]
        summary?: { autoApproved: number; manualReview: number }
      }
      if (!res.ok || !payload.results || !payload.summary) {
        throw new Error(payload.error || 'Failed to review pending submissions.')
      }
      setReviews((current) => ({
        ...current,
        ...Object.fromEntries((payload.results ?? []).map((result) => [result.showcaseId, result])),
      }))
      toast.success(
        `Batch review complete: ${payload.summary.autoApproved} auto-approved, ${payload.summary.manualReview} escalated.`
      )
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to review pending submissions.')
    } finally {
      setBatchReviewing(false)
    }
  }

  return (
    <>
      {aiEnabled ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Guarded auto-actions</p>
            <p className="text-sm text-muted-foreground">
              Batch review auto-approves and features pending submissions scoring 5+ with clean validation and no risk flags.
            </p>
          </div>
          <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={batchReviewing} onClick={reviewPendingBatch}>
            <ShieldCheck className="h-4 w-4" />
            {batchReviewing ? 'Reviewing pending…' : 'Review Pending With AI'}
          </Button>
        </div>
      ) : null}
      <ul className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        rows.map((row, i) => (
          <li
            key={row.id}
            className="grid gap-4 rounded-xl border border-border bg-card/50 p-4 xl:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {row.screenshotUrls.slice(0, 3).map((url, j) => (
                <div
                  key={`${row.id}-thumb-${j}`}
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                >
                  <Image
                    src={cloudinaryScaledUrl(url, 200)}
                    alt=""
                    width={200}
                    height={120}
                    className="h-full w-full object-cover"
                  unoptimized
                />
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{row.title}</span>
                <Badge
                  variant={
                    row.status === 'approved' ? 'default' : row.status === 'rejected' ? 'destructive' : 'secondary'
                  }
                >
                  {row.status}
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{row.description}</p>
              <p className="text-xs text-muted-foreground">
                {row.builderName} · {row.builderEmail}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!aiEnabled || reviewingIds.has(row.id)}
                  onClick={() => reviewWithAi(row.id)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {reviewingIds.has(row.id) ? 'Reviewing…' : reviews[row.id] ? 'Review again' : 'Review with AI'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!aiEnabled || reviewingIds.has(row.id) || row.status !== 'pending'}
                  onClick={() => reviewWithAi(row.id, true)}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {reviewingIds.has(row.id) ? 'Running…' : 'Guarded auto-action'}
                </Button>
                {row.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={busyId !== null}
                      onClick={() =>
                        run(row.id, async () => {
                          await updateShowcaseStatus(row.id, 'approved')
                          toast.success('Approved')
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() =>
                        run(row.id, async () => {
                          await updateShowcaseStatus(row.id, 'rejected')
                          toast.success('Rejected')
                        })
                      }
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {row.status === 'approved' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() =>
                        run(row.id, async () => {
                          await updateShowcaseStatus(row.id, 'pending')
                          toast.success('Moved to pending')
                        })
                      }
                    >
                      Pending
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() =>
                        run(row.id, async () => {
                          await updateShowcaseStatus(row.id, 'rejected')
                          toast.success('Rejected')
                        })
                      }
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {row.status === 'rejected' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId !== null}
                    onClick={() =>
                      run(row.id, async () => {
                        await updateShowcaseStatus(row.id, 'pending')
                        toast.success('Moved to pending')
                      })
                    }
                  >
                    Pending
                  </Button>
                ) : null}
              </div>
              {reviewErrors[row.id] ? (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{reviewErrors[row.id]}</p>
                </div>
              ) : null}
              {reviews[row.id] ? (
                <Card size="sm" className="border border-border/80 bg-background/70">
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>AI review</CardTitle>
                      <Badge variant={recommendationVariant(reviews[row.id].review.recommendation)}>
                        {reviews[row.id].review.recommendation.replaceAll('_', ' ')}
                      </Badge>
                      <Badge variant="outline">Quality {reviews[row.id].review.qualityScore}/10</Badge>
                      <Badge variant={reviews[row.id].policyOutcome.decisionMode === 'auto_approved' ? 'default' : 'secondary'}>
                        {reviews[row.id].policyOutcome.decisionMode === 'auto_approved' ? 'Auto-approved policy' : 'Manual review policy'}
                      </Badge>
                      {reviews[row.id].review.featuredSuggestion.shouldFeature ? (
                        <Badge variant="secondary">Suggested feature</Badge>
                      ) : null}
                      {reviews[row.id].autoAction?.success ? (
                        <Badge variant="default">AI approved + featured</Badge>
                      ) : null}
                    </div>
                    <CardDescription>{reviews[row.id].review.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Validation checks
                      </p>
                      {signalSummary(reviews[row.id]).length === 0 ? (
                        <p className="mt-1 text-sm text-foreground/90">All deterministic checks passed.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                          {signalSummary(reviews[row.id]).map((flag) => (
                            <li key={flag}>• {flag}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Policy reasons
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                        {reviews[row.id].policyOutcome.reasons.map((reason) => (
                          <li key={reason}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Staff notes
                      </p>
                      <p className="mt-1 text-sm text-foreground/90">{reviews[row.id].review.moderationNotes}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Feature suggestion
                        </p>
                        <p className="mt-1 text-sm text-foreground/90">
                          {reviews[row.id].review.featuredSuggestion.reason}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Risk flags
                        </p>
                        {reviews[row.id].review.riskFlags.length === 0 ? (
                          <p className="mt-1 text-sm text-foreground/90">No obvious flags from the submitted data.</p>
                        ) : (
                          <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                            {(reviews[row.id].review.riskFlags ?? []).map((flag) => (
                              <li key={flag}>• {flag}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    {reviews[row.id].autoAction ? (
                      <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Auto-action audit
                        </p>
                        <p className="mt-1 text-sm text-foreground/90">
                          {reviews[row.id].autoAction?.success
                            ? `Approved and featured automatically from ${reviews[row.id].autoAction?.preActionStatus} to ${reviews[row.id].autoAction?.postActionStatus}.`
                            : `Auto-action blocked: ${reviews[row.id].autoAction?.failureReason ?? 'Unknown failure.'}`}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
              {row.status === 'approved' ? (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Switch
                    id={`feat-${row.id}`}
                    checked={row.featured}
                    disabled={busyId !== null}
                    onCheckedChange={() =>
                      run(row.id, async () => {
                        await toggleShowcaseFeatured(row.id)
                      })
                    }
                  />
                  <label htmlFor={`feat-${row.id}`} className="text-sm text-muted-foreground">
                    Featured on site
                  </label>
                </div>
              ) : null}
            </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 justify-self-end self-start">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={i === 0 || busyId !== null}
                aria-label="Move up"
                onClick={() =>
                  run(row.id, async () => {
                    await swapShowcaseOrder(row.id, 'up')
                  })
                }
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={i === rows.length - 1 || busyId !== null}
                aria-label="Move down"
                onClick={() =>
                  run(row.id, async () => {
                    await swapShowcaseOrder(row.id, 'down')
                  })
                }
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                disabled={busyId !== null}
                aria-label="Delete"
                onClick={() =>
                  run(row.id, async () => {
                    await deleteShowcase(row.id)
                    toast.success('Deleted')
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))
      )}
      </ul>
    </>
  )
}
