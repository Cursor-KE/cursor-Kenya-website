export const SHOWCASE_PROJECT_KIND_VALUES = [
  'saas',
  'portfolio',
  'open_source',
  'marketing_site',
  'internal_tool',
  'agency_client',
  'other',
] as const

export type ShowcaseProjectKind = (typeof SHOWCASE_PROJECT_KIND_VALUES)[number]

export const SHOWCASE_PROJECT_KIND_LABELS: Record<ShowcaseProjectKind, string> = {
  saas: 'SaaS / product',
  portfolio: 'Portfolio',
  open_source: 'Open source',
  marketing_site: 'Marketing / landing',
  internal_tool: 'Internal tool',
  agency_client: 'Client / agency work',
  other: 'Other',
}

export function isShowcaseProjectKind (v: string): v is ShowcaseProjectKind {
  return (SHOWCASE_PROJECT_KIND_VALUES as readonly string[]).includes(v)
}

/** URL `?kind=` — `null` means show all (or unknown param). */
export function parseShowcaseKindQuery (param: string | string[] | undefined): ShowcaseProjectKind | null {
  const raw = Array.isArray(param) ? param[0] : param
  if (!raw || raw === 'all') return null
  if (isShowcaseProjectKind(raw)) return raw
  return null
}

/** Coerce DB or legacy values into a known kind (never throws). */
export function normalizeStoredProjectKind (v: string | null | undefined): ShowcaseProjectKind {
  if (v && isShowcaseProjectKind(v)) return v
  return 'other'
}

export function countShowcaseProjectsByKind (
  projects: { projectKind: string }[]
): Record<ShowcaseProjectKind, number> {
  const counts = Object.fromEntries(SHOWCASE_PROJECT_KIND_VALUES.map((k) => [k, 0])) as Record<
    ShowcaseProjectKind,
    number
  >
  for (const p of projects) {
    counts[normalizeStoredProjectKind(p.projectKind)] += 1
  }
  return counts
}
