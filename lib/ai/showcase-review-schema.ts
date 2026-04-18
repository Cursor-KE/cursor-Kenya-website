import { z } from 'zod'
import type { ShowcaseReviewPolicyOutcome, ShowcaseValidationSignals } from '@/db/schema'

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

export const showcaseValidationSignalsSchema = z.object({
  titleLengthOk: z.boolean(),
  descriptionLengthOk: z.boolean(),
  descriptionWordCountOk: z.boolean(),
  builderNameLengthOk: z.boolean(),
  projectUrlOk: z.boolean(),
  repoUrlOk: z.boolean(),
  screenshotCountOk: z.boolean(),
  duplicateScreenshots: z.boolean(),
}).strict()

export const showcaseReviewPolicyOutcomeSchema = z.object({
  decisionMode: z.enum(['manual_review', 'auto_approved']),
  autoAction: z.enum(['approve']).nullable(),
  reasons: z.array(z.string().trim().min(1).max(200)).max(8),
}).strict()

export type ShowcaseSavedReview = {
  showcaseId: string
  reviewId: string
  model: string
  createdAt: string
  statusAtReview: 'pending' | 'approved' | 'rejected'
  validationSignals: ShowcaseValidationSignals
  policyOutcome: ShowcaseReviewPolicyOutcome
  review: ShowcaseReviewResult
  autoAction?: {
    id: string
    action: 'approve'
    success: boolean
    executedAt: string
    failureReason: string | null
    preActionStatus: 'pending' | 'approved' | 'rejected'
    postActionStatus: 'pending' | 'approved' | 'rejected' | null
  } | null
}

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
