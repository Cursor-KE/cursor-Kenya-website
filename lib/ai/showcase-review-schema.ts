import { z } from 'zod'

export const showcaseReviewResultSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  qualityScore: z.number().int().min(1).max(10),
  recommendation: z.enum(['approve', 'reject', 'needs_manual_review']),
  featuredSuggestion: z.object({
    shouldFeature: z.boolean(),
    reason: z.string().trim().min(1).max(300),
  }).strict(),
  riskFlags: z.array(z.string().trim().min(1).max(160)).max(8),
  moderationNotes: z.string().trim().min(1).max(600),
}).strict()

export type ShowcaseReviewResult = z.infer<typeof showcaseReviewResultSchema>

export const showcaseReviewJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'qualityScore',
    'recommendation',
    'featuredSuggestion',
    'riskFlags',
    'moderationNotes',
  ],
  properties: {
    summary: { type: 'string' },
    qualityScore: { type: 'integer', minimum: 1, maximum: 10 },
    recommendation: {
      type: 'string',
      enum: ['approve', 'reject', 'needs_manual_review'],
    },
    featuredSuggestion: {
      type: 'object',
      additionalProperties: false,
      required: ['shouldFeature', 'reason'],
      properties: {
        shouldFeature: { type: 'boolean' },
        reason: { type: 'string' },
      },
    },
    riskFlags: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8,
    },
    moderationNotes: { type: 'string' },
  },
} as const
