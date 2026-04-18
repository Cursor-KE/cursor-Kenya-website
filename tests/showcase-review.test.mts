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
  SESSION_UNAUTHORIZED,
} from '../lib/ai/showcase-review-handler.ts'
import { showcaseReviewResultSchema } from '../lib/ai/showcase-review-schema.ts'

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

test('showcase review schema accepts a valid review payload', () => {
  const parsed = showcaseReviewResultSchema.parse(review)
  assert.equal(parsed.qualityScore, 8)
})

test('prompt builder includes the grounding instructions and submission data', () => {
  const prompt = buildShowcaseReviewPrompt(submission)
  assert.match(prompt, /Judge only from the submission data below/)
  assert.match(prompt, /Cursor Kenya Hub/)
  assert.match(prompt, /https:\/\/github.com\/example\/repo/)
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
      getSubmissionById: async () => submission,
      reviewSubmission: async () => review,
    }
  )

  assert.equal(result.status, 401)
  assert.ok('error' in result.body)
  assert.equal(result.body.error, 'You must be signed in to review showcase submissions.')
})

test('request handler validates request body and missing rows', async () => {
  const deps = {
    requireSession: async () => ({ user: { id: 'user_1' } }),
    getSubmissionById: async () => null,
    reviewSubmission: async () => review,
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
      getSubmissionById: async () => submission,
      reviewSubmission: async () => review,
    }
  )

  assert.equal(result.status, 200)
  assert.ok('review' in result.body)
  assert.deepEqual(result.body.review, review)
})

test('request handler maps configuration and invalid output failures', async () => {
  const baseDeps = {
    requireSession: async () => ({ user: { id: 'user_1' } }),
    getSubmissionById: async () => submission,
  }

  const missingConfig = await handleShowcaseReviewRequest(
    { showcaseId: submission.id },
    {
      ...baseDeps,
      reviewSubmission: async () => {
        throw new ShowcaseReviewConfigError('OpenAI is not configured for showcase reviews.')
      },
    }
  )
  assert.equal(missingConfig.status, 503)

  const invalidOutput = await handleShowcaseReviewRequest(
    { showcaseId: submission.id },
    {
      ...baseDeps,
      reviewSubmission: async () => {
        throw new ShowcaseReviewOutputError('The model response did not match the review schema.')
      },
    }
  )
  assert.equal(invalidOutput.status, 502)
})
