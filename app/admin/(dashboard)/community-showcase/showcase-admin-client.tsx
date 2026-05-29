'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertTriangle, Bot, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { communityShowcase } from '@/db/schema'

type Row = typeof communityShowcase.$inferSelect
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
type SubmissionStatus = Exclude<StatusFilter, 'all'>

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function recommendationVariant (
  recommendation: ShowcaseReviewResult['recommendation']
): 'default' | 'secondary' | 'destructive' {
  if (recommendation === 'approve') return 'default'
  if (recommendation === 'reject') return 'destructive'
  return 'secondary'
}

function statusVariant (status: SubmissionStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'approved') return 'default'
  if (status === 'rejected') return 'destructive'
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

function repositoryUrlForReview (review: ShowcaseSavedReview, row: Row) {
  const url = review.review.repositoryUrl?.trim() || row.repoUrl?.trim() || ''
  return url && url.toLowerCase() !== 'not provided' ? url : null
}

function formatSubmittedAt (date: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatProjectKind (kind: string) {
  return kind
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Other'
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
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(() => new Set())
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [deleteDialogRow, setDeleteDialogRow] = useState<Row | null>(null)
  const statusCounts = rows.reduce<Record<SubmissionStatus, number>>(
    (counts, row) => {
      counts[row.status] += 1
      return counts
    },
    { pending: 0, approved: 0, rejected: 0 }
  )
  const totalRows = rows.length
  const filteredRows = statusFilter === 'all' ? rows : rows.filter((row) => row.status === statusFilter)
  const rowOrderIndexById = new Map(rows.map((row, index) => [row.id, index]))

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

  function toggleReviewDetails (id: string) {
    setExpandedReviewIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function renderAiReviewCard (row: Row) {
    const review = reviews[row.id]
    if (!review) return null

    const isExpanded = expandedReviewIds.has(row.id)
    const detailsId = `ai-review-details-${row.id}`
    const riskCount = review.review.riskFlags.length
    const policyMode = review.policyOutcome.decisionMode === 'auto_approved'
      ? 'Auto-approved policy'
      : 'Manual review policy'
    const featureSuggestion = review.review.featuredSuggestion.shouldFeature
      ? 'Suggested feature'
      : 'Not suggested for feature'

    return (
      <Card size="sm" className="border border-border/80 bg-background/70 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>AI review</CardTitle>
                {review.autoAction?.success ? (
                  <Badge variant="default">AI approved + featured</Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={recommendationVariant(review.review.recommendation)}>
                  {review.review.recommendation.replaceAll('_', ' ')}
                </Badge>
                <Badge variant="outline">Quality {review.review.qualityScore}/10</Badge>
                <Badge variant={review.policyOutcome.decisionMode === 'auto_approved' ? 'default' : 'secondary'}>
                  {policyMode}
                </Badge>
                <Badge variant={riskCount > 0 ? 'destructive' : 'outline'}>
                  {riskCount} {riskCount === 1 ? 'risk' : 'risks'}
                </Badge>
                <Badge variant={review.review.featuredSuggestion.shouldFeature ? 'secondary' : 'outline'}>
                  {featureSuggestion}
                </Badge>
              </div>
              <CardDescription>{review.review.summary}</CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full shrink-0 lg:w-auto"
              aria-controls={detailsId}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Hide' : 'View'} AI review details for ${row.title}`}
              onClick={() => toggleReviewDetails(row.id)}
            >
              {isExpanded ? 'Hide details' : 'View details'}
            </Button>
          </div>
        </CardHeader>
        {isExpanded ? (
          <CardContent id={detailsId} className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Project overview
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                {review.review.projectOverview || review.review.summary}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Feature highlights
              </p>
              {(review.review.featureHighlights ?? []).length === 0 ? (
                <p className="mt-1 text-sm text-foreground/90">No feature highlights were captured in this review.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                  {review.review.featureHighlights.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Repository
              </p>
              {repositoryUrlForReview(review, row) ? (
                <a
                  href={repositoryUrlForReview(review, row) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-medium text-primary hover:underline"
                >
                  {repositoryUrlForReview(review, row)}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <p className="mt-1 text-sm text-foreground/90">No repository URL was provided.</p>
              )}
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Score rationale
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                {review.review.scoreRationale || review.review.moderationNotes}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Validation checks
              </p>
              {signalSummary(review).length === 0 ? (
                <p className="mt-1 text-sm text-foreground/90">All deterministic checks passed.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                  {signalSummary(review).map((flag) => (
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
                {review.policyOutcome.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Staff notes
              </p>
              <p className="mt-1 text-sm text-foreground/90">{review.review.moderationNotes}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Feature suggestion
                </p>
                <p className="mt-1 text-sm text-foreground/90">
                  {review.review.featuredSuggestion.reason}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Risk flags
                </p>
                {review.review.riskFlags.length === 0 ? (
                  <p className="mt-1 text-sm text-foreground/90">No obvious flags from the submitted data.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                    {(review.review.riskFlags ?? []).map((flag) => (
                      <li key={flag}>• {flag}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {review.autoAction ? (
              <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Auto-action audit
                </p>
                <p className="mt-1 text-sm text-foreground/90">
                  {review.autoAction?.success
                    ? `Approved and featured automatically from ${review.autoAction?.preActionStatus} to ${review.autoAction?.postActionStatus}.`
                    : `Auto-action blocked: ${review.autoAction?.failureReason ?? 'Unknown failure.'}`}
                </p>
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    )
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Showcase submission status summary">
        {statusFilterOptions.map((option) => {
          const count = option.value === 'all' ? totalRows : statusCounts[option.value]
          const isActive = statusFilter === option.value

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                'rounded-2xl border bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive ? 'border-primary shadow-sm ring-1 ring-primary/25' : 'border-border'
              )}
              aria-pressed={isActive}
              onClick={() => setStatusFilter(option.value)}
            >
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {option.label}
              </span>
              <span className="mt-2 block text-2xl font-semibold tracking-tight text-foreground">{count}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {option.value === 'all' ? 'Total submissions' : `${option.label} submissions`}
              </span>
            </button>
          )
        })}
      </div>

      <ul className="space-y-4">
        {rows.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No submissions yet.
          </li>
        ) : filteredRows.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            No submissions match this filter.
          </li>
        ) : (
          filteredRows.map((row) => {
            const rowOrderIndex = rowOrderIndexById.get(row.id) ?? 0
            const isFirstRow = rowOrderIndex === 0
            const isLastRow = rowOrderIndex === rows.length - 1

            return (
              <li
                key={row.id}
                className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm"
              >
                <div className="border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-foreground">{row.title}</h2>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        <Badge variant="outline">{formatProjectKind(row.projectKind)}</Badge>
                        {row.featured ? <Badge variant="secondary">Featured</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted by <span className="font-medium text-foreground/80">{row.builderName}</span> ·{' '}
                        <a href={`mailto:${row.builderEmail}`} className="hover:text-foreground hover:underline">
                          {row.builderEmail}
                        </a>{' '}
                        · {formatSubmittedAt(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!aiEnabled || reviewingIds.has(row.id)}
                        onClick={() => reviewWithAi(row.id)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {reviewingIds.has(row.id) ? 'Reviewing…' : reviews[row.id] ? 'Review again' : 'Review with AI'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!aiEnabled || reviewingIds.has(row.id) || row.status !== 'pending'}
                        onClick={() => reviewWithAi(row.id, true)}
                      >
                        <Bot className="h-3.5 w-3.5" />
                        {reviewingIds.has(row.id) ? 'Running…' : 'Guarded auto-action'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="min-w-0 space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
                      <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-[20rem] lg:flex-wrap lg:overflow-visible lg:pb-0">
                        {row.screenshotUrls.slice(0, 3).map((url, j) => (
                          <div
                            key={`${row.id}-thumb-${j}`}
                            className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
                          >
                            <Image
                              src={cloudinaryScaledUrl(url, 240)}
                              alt={`Screenshot ${j + 1} for ${row.title}`}
                              width={240}
                              height={150}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0 space-y-3">
                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{row.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <a
                            href={row.projectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 font-medium text-foreground hover:border-primary/40 hover:text-primary"
                          >
                            Project
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {row.repoUrl ? (
                            <a
                              href={row.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 font-medium text-foreground hover:border-primary/40 hover:text-primary"
                            >
                              Repository
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                          <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                            {row.screenshotUrls.length} {row.screenshotUrls.length === 1 ? 'screenshot' : 'screenshots'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {reviewErrors[row.id] ? (
                      <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{reviewErrors[row.id]}</p>
                      </div>
                    ) : null}

                    {renderAiReviewCard(row)}
                  </div>

                  <aside className="space-y-4 rounded-xl border border-border bg-background/70 p-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Moderation
                      </p>
                      <div className="flex flex-wrap gap-2">
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
                    </div>

                    {row.status === 'approved' ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                        <label htmlFor={`feat-${row.id}`} className="text-sm text-muted-foreground">
                          Featured on site
                        </label>
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
                      </div>
                    ) : null}

                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Order and danger zone
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isFirstRow || busyId !== null}
                          aria-label={`Move ${row.title} up`}
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
                          disabled={isLastRow || busyId !== null}
                          aria-label={`Move ${row.title} down`}
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
                          className="ml-auto h-8 w-8 text-destructive hover:text-destructive"
                          disabled={busyId !== null}
                          aria-label={`Delete ${row.title}`}
                          onClick={() => setDeleteDialogRow(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </aside>
                </div>
              </li>
            )
          })
        )}
      </ul>

      <Dialog open={Boolean(deleteDialogRow)} onOpenChange={(open) => !open && setDeleteDialogRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete showcase submission?</DialogTitle>
            <DialogDescription>
              {deleteDialogRow
                ? `This will permanently delete “${deleteDialogRow.title}” from the community showcase queue.`
                : 'This will permanently delete the selected community showcase submission.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteDialogRow || busyId !== null}
              onClick={() => {
                if (!deleteDialogRow) return
                const rowToDelete = deleteDialogRow
                setDeleteDialogRow(null)
                void run(rowToDelete.id, async () => {
                  await deleteShowcase(rowToDelete.id)
                  toast.success('Deleted')
                })
              }}
            >
              Delete submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
