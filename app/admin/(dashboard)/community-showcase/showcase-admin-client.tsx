'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteShowcase,
  swapShowcaseOrder,
  toggleShowcaseFeatured,
  updateShowcaseStatus,
} from '@/lib/actions/showcase'
import { cloudinaryScaledUrl } from '@/lib/cloudinary/delivery-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { communityShowcase } from '@/db/schema'

type Row = typeof communityShowcase.$inferSelect

export function ShowcaseAdminClient ({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

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

  return (
    <ul className="mt-8 space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        rows.map((row, i) => (
          <li
            key={row.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4 sm:flex-row sm:items-start"
          >
            <div className="flex gap-2">
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
              {row.status === 'approved' ? (
                <div className="flex items-center gap-2 pt-2">
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
            <div className="flex shrink-0 items-center gap-0.5 self-end sm:self-start">
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
  )
}
