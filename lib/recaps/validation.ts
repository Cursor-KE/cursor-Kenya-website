import { z } from 'zod'

export function normalizeRecapSlug (input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

const optionalUrl = z.string().trim().max(2000).refine(
  (value) => value === '' || z.url().safeParse(value).success,
  'Cover image must be a valid URL.'
)

export const recapInputSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(160),
  slug: z.string().trim().max(180),
  excerpt: z.string().trim().min(10, 'Add a short summary.').max(360),
  content: z.string().trim().min(20, 'The recap needs a little more detail.').max(100_000),
  coverImageUrl: optionalUrl,
  status: z.enum(['draft', 'published']),
}).transform((input, context) => {
  const slug = normalizeRecapSlug(input.slug || input.title)
  if (!slug) {
    context.addIssue({ code: 'custom', path: ['slug'], message: 'Add a valid title or slug.' })
    return z.NEVER
  }
  return { ...input, slug, coverImageUrl: input.coverImageUrl || null }
})
