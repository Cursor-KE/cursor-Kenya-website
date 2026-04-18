import type { communityShowcase } from '@/db/schema'
import {
  showcaseReviewJsonSchema,
  showcaseReviewResultSchema,
  type ShowcaseReviewResult,
} from '@/lib/ai/showcase-review-schema'
import type { ShowcaseValidationSignals } from '@/lib/showcase/validation'

export type ShowcaseReviewSubmission = Pick<
  typeof communityShowcase.$inferSelect,
  | 'id'
  | 'title'
  | 'description'
  | 'projectUrl'
  | 'repoUrl'
  | 'builderName'
  | 'builderEmail'
  | 'screenshotUrls'
  | 'status'
  | 'featured'
  | 'createdAt'
>

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const SHOWCASE_REVIEW_PROMPT_VERSION = 'showcase-review-v3'

export class ShowcaseReviewConfigError extends Error {}
export class ShowcaseReviewOutputError extends Error {}
export class ShowcaseReviewUpstreamError extends Error {}

export function isShowcaseReviewConfigured () {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function getShowcaseReviewModel () {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL
}

export function buildShowcaseReviewPrompt (
  submission: ShowcaseReviewSubmission,
  validationSignals?: ShowcaseValidationSignals
) {
  return [
    'You are reviewing a community showcase submission for an internal admin team.',
    'Judge only from the submission data below.',
    'Do not browse links, infer hidden product quality, or invent missing facts.',
    'If evidence is limited or mixed, use needs_manual_review.',
    'Optimize for staff moderation notes, not applicant-facing language.',
    'Treat the validation signals as objective checks and keep them separate from subjective judgment.',
    '',
    `Prompt version: ${SHOWCASE_REVIEW_PROMPT_VERSION}`,
    `Submission ID: ${submission.id}`,
    `Current status: ${submission.status}`,
    `Currently featured: ${submission.featured ? 'yes' : 'no'}`,
    `Submitted at: ${submission.createdAt.toISOString()}`,
    `Title: ${submission.title}`,
    `Builder name: ${submission.builderName}`,
    `Builder email: ${submission.builderEmail}`,
    `Project URL: ${submission.projectUrl}`,
    `Repository URL: ${submission.repoUrl ?? 'Not provided'}`,
    `Screenshot count: ${submission.screenshotUrls.length}`,
    'Screenshots:',
    ...submission.screenshotUrls.map((url, index) => `- [${index + 1}] ${url}`),
    '',
    'Validation signals:',
    validationSignals
      ? JSON.stringify(validationSignals, null, 2)
      : 'No validation signals were provided.',
    '',
    'Description:',
    submission.description,
  ].join('\n')
}

type OpenAIResponsesApiPayload = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
      refusal?: string
    }>
  }>
  error?: {
    message?: string
  }
}

export function extractStructuredOutputText (payload: OpenAIResponsesApiPayload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.refusal === 'string' && content.refusal.trim()) {
        throw new ShowcaseReviewOutputError(content.refusal)
      }
      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) {
        return content.text
      }
    }
  }

  throw new ShowcaseReviewOutputError(payload.error?.message || 'The model did not return structured review output.')
}

export async function reviewShowcaseSubmission (
  submission: ShowcaseReviewSubmission,
  validationSignals?: ShowcaseValidationSignals
): Promise<ShowcaseReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new ShowcaseReviewConfigError('OpenAI is not configured for showcase reviews.')
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getShowcaseReviewModel(),
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'Return a concise structured moderation review. Stay grounded in the provided submission only. Flag uncertainty instead of assuming facts.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildShowcaseReviewPrompt(submission, validationSignals),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'showcase_review',
          strict: true,
          schema: showcaseReviewJsonSchema,
        },
      },
    }),
  })

  const payload = (await response.json()) as OpenAIResponsesApiPayload
  if (!response.ok) {
    throw new ShowcaseReviewUpstreamError(payload.error?.message || 'OpenAI request failed.')
  }

  const text = extractStructuredOutputText(payload)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ShowcaseReviewOutputError('The model returned invalid JSON.')
  }

  const validated = showcaseReviewResultSchema.safeParse(parsed)
  if (!validated.success) {
    throw new ShowcaseReviewOutputError('The model response did not match the review schema.')
  }

  return validated.data
}
