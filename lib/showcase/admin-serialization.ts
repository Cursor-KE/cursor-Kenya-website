import type { communityShowcase } from '@/db/schema'

type CommunityShowcaseRow = typeof communityShowcase.$inferSelect

export type CommunityShowcaseAdminRow = Omit<CommunityShowcaseRow, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

const submittedAtFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function serializeCommunityShowcaseAdminRows (
  rows: CommunityShowcaseRow[]
): CommunityShowcaseAdminRow[] {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export function formatShowcaseSubmittedAt (createdAt: string) {
  return submittedAtFormatter.format(new Date(createdAt))
}
