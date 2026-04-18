import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ShowcaseReviewConfigError,
  ShowcaseReviewOutputError,
  buildShowcaseReviewPrompt,
  extractStructuredOutputText,
} from '../lib/ai/showcase-review.ts'
import {
  handleShowcaseReviewRequest,
  handleShowcaseBatchReviewRequest,
  SESSION_UNAUTHORIZED,
} from '../lib/ai/showcase-review-handler.ts'
import { showcaseReviewResultSchema } from '../lib/ai/showcase-review-schema.ts'
import { evaluateShowcasePolicy } from '../lib/ai/showcase-policy.ts'
import { getShowcaseValidationSignals } from '../lib/showcase/validation.ts'

const submission = {
  id: 'showcase_123',
  title: 'Cursor Kenya Hub',
  description: 'A community platform for events, projects, and member highlights.',
  projectUrl: 'https://example.com/demo',
  repoUrl: 'https://github.com/example/repo',
  builderName: 'Ada',
  builderEmail: 'ada@example.com',
  screenshotUrls: ['https://cdn.example.com/1.png', 'https://cdn.example.com/2.png'],
  status: 'pending' as const,
  featured: false,
  createdAt: new Date('2026-04-18T12:00:00.000Z'),
}

const review = {
  summary: 'A concise community-focused project with enough context to understand the submission.',
  qualityScore: 8,
  recommendation: 'approve' as const,
  featuredSuggestion: {
    shouldFeature: true,
    reason: 'The submission sounds polished and has enough supporting material to spotlight.',
  },
  riskFlags: ['No repository activity verified from submission-only review.'],
  moderationNotes: 'Looks ready for approval, but staff should still spot-check the links before featuring.',
}

const savedReview = {
  showcaseId: submission.id,
  reviewId: 'review_1',
  model: 'gpt-4o-mini',
  createdAt: '2026-04-18T12:00:00.000Z',
  statusAtReview: 'pending' as const,
  validationSignals: {
    titleLengthOk: true,
    descriptionLengthOk: true,
    descriptionWordCountOk: true,
    builderNameLengthOk: true,
    projectUrlOk: true,
    repoUrlOk: true,
    screenshotCountOk: true,
    duplicateScreenshots: false,
  },
  policyOutcome: {
    decisionMode: 'manual_review' as const,
    autoAction: null,
    reasons: ['Risk flags require manual review.'],
  },
  review,
  autoAction: null,
}

test('showcase review schema accepts a valid review payload', () => {
  const parsed = showcaseReviewResultSchema.parse(review)
  assert.equal(parsed.qualityScore, 8)
})

test('prompt builder includes the grounding instructions and submission data', () => {
  const prompt = buildShowcaseReviewPrompt(submission, savedReview.validationSignals)
  assert.match(prompt, /Judge only from the submission data below/)
  assert.match(prompt, /Validation signals/)
  assert.match(prompt, /Cursor Kenya Hub/)
  assert.match(prompt, /https:\/\/github.com\/example\/repo/)
})

test('validation signals and policy allow only strong low-risk auto-approval', () => {
  const weakSignals = getShowcaseValidationSignals({
    title: 'Short',
    description: 'Too short',
    projectUrl: 'notaurl',
    repoUrl: '',
    builderName: 'A',
    screenshotUrls: ['https://cdn.example.com/1.png'],
  })
  assert.equal(weakSignals.titleLengthOk, false)
  assert.equal(weakSignals.descriptionWordCountOk, false)

  const autoApproved = evaluateShowcasePolicy({
    status: 'pending',
    validationSignals: savedReview.validationSignals,
    review: {
      ...review,
      qualityScore: 5,
      riskFlags: [],
    },
  })
  assert.equal(autoApproved.decisionMode, 'auto_approved')
  assert.equal(autoApproved.autoAction, 'approve_and_feature')

  const blocked = evaluateShowcasePolicy({
    status: 'pending',
    validationSignals: savedReview.validationSignals,
    review,
  })
  assert.equal(blocked.decisionMode, 'manual_review')
})

test('structured output extractor prefers output_text and rejects refusals', () => {
  const outputText = extractStructuredOutputText({
    output_text: JSON.stringify(review),
  })
  assert.equal(outputText, JSON.stringify(review))

  assert.throws(
    () =>
      extractStructuredOutputText({
        output: [
          {
            content: [{ refusal: 'Refused for safety reasons.' }],
          },
        ],
      }),
    ShowcaseReviewOutputError
  )
})

test('request handler rejects unauthenticated access', async () => {
  const result = await handleShowcaseReviewRequest(
    { showcaseId: submission.id },
    {
      requireSession: async () => {
        throw new Error(SESSION_UNAUTHORIZED)
      },
      runSingleReview: async () => savedReview,
      runBatchReview: async () => [savedReview],
    }
  )

  assert.equal(result.status, 401)
  assert.ok('error' in result.body)
  assert.equal(result.body.error, 'You must be signed in to review showcase submissions.')
})

test('request handler validates request body and missing rows', async () => {
  const deps = {
    requireSession: async () => ({ user: { id: 'user_1' } }),
    runSingleReview: async () => null,
    runBatchReview: async () => [],
  }

  const missingId = await handleShowcaseReviewRequest({}, deps)
  assert.equal(missingId.status, 400)
  assert.ok('error' in missingId.body)

  const missingRow = await handleShowcaseReviewRequest({ showcaseId: submission.id }, deps)
  assert.equal(missingRow.status, 404)
  assert.ok('error' in missingRow.body)
})

test('request handler returns a valid review on success', async () => {
  const result = await handleShowcaseReviewRequest(
    { showcaseId: submission.id },
    {
      requireSession: async () => ({ user: { id: 'user_1' } }),
      runSingleReview: async () => savedReview,
      runBatchReview: async () => [savedReview],
    }
  )

  assert.equal(result.status, 200)
  assert.ok('result' in result.body)
  assert.deepEqual(result.body.result, savedReview)
})

test('request handler maps configuration and invalid output failures', async () => {
  const baseDeps = {
    requireSession: async () => ({ user: { id: 'user_1' } }),
    runBatchReview: async () => [savedReview],
  }

  const missingConfig = await handleShowcaseReviewRequest(
    { showcaseId: submission.id },
    {
      ...baseDeps,
      runSingleReview: async () => {
        throw new ShowcaseReviewConfigError('OpenAI is not configured for showcase reviews.')
      },
    }
  )
  assert.equal(missingConfig.status, 503)

  const invalidOutput = await handleShowcaseReviewRequest(
    { showcaseId: submission.id },
    {
      ...baseDeps,
      runSingleReview: async () => {
        throw new ShowcaseReviewOutputError('The model response did not match the review schema.')
      },
    }
  )
  assert.equal(invalidOutput.status, 502)
})

test('batch handler returns grouped summary counts', async () => {
  const autoApprovedReview = {
    ...savedReview,
    reviewId: 'review_2',
    policyOutcome: {
      decisionMode: 'auto_approved' as const,
      autoAction: 'approve_and_feature' as const,
      reasons: ['Policy allowed auto-approval and featuring for a qualifying pending submission.'],
    },
  }

  const result = await handleShowcaseBatchReviewRequest(
    { limit: 10 },
    {
      requireSession: async () => ({ user: { id: 'user_1' } }),
      runSingleReview: async () => savedReview,
      runBatchReview: async () => [savedReview, autoApprovedReview],
    }
  )

  assert.equal(result.status, 200)
  assert.ok('results' in result.body)
  assert.equal(result.body.summary.autoApproved, 1)
  assert.equal(result.body.summary.manualReview, 1)
})
