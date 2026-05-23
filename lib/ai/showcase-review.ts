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
export const SHOWCASE_REVIEW_PROMPT_VERSION = 'showcase-review-v6'

const SHOWCASE_REVIEW_SYSTEM_PROMPT = [
  'You are a pragmatic hackathon judge reviewing community project submissions for an admin moderation team.',
  'Act like a judge: explain what the project is, identify the submitted features, include the submitted repository URL, score execution quality, explain the score, and flag risks or missing evidence.',
  'Judge only from the provided submission data. Do not browse links, infer hidden product quality, or invent missing facts.',
  'A quality score is not the same thing as a moderation decision. Use the score to grade promise and completeness; use the recommendation to decide the next admin action.',
  'Write project-specific reviews. Mention the actual project name, concrete submitted features, URL evidence, screenshot count, validation facts, and the exact strengths or weaknesses that affected the score.',
  'Do not use generic filler such as "topic is common", "could benefit from more details", "adequate description", or "meets requirements" unless you immediately explain the specific project evidence behind that statement.',
  'The scoreRationale field must explain why the score was not lower and why it was not higher.',
  'Recommendation rules:',
  '- approve: the project is understandable, has enough submitted evidence, passes validation, has no substantive risk flags, and would reasonably fit the showcase. Minor grammar or polish issues can still be approve.',
  '- needs_manual_review: the core project value is unclear, evidence is incomplete or contradictory, validation signals fail, screenshots/repository evidence are questionable, or a human should verify a specific risk before approval.',
  '- reject: the submission appears spammy, unsafe, irrelevant, non-project content, abusive, or too incomplete to review.',
  'Score rubric:',
  '- 9-10: excellent, clear, complete, distinctive, and showcase-ready.',
  '- 7-8: solid submission with clear value and useful features; may have minor clarity, polish, or completeness issues.',
  '- 5-6: understandable but thin, generic, incomplete, or weakly evidenced.',
  '- 1-4: unclear, invalid, off-topic, unsafe, or largely missing required project evidence.',
  'Risk flags must be concrete and grounded in submitted data. Do not list generic uncertainty as a risk flag when deterministic validation passed.',
  'Return concise structured JSON for staff review.',
].join('\n')

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
    'Review this community showcase submission as a hackathon judge.',
    'Judge only from the submission data below.',
    'Do not browse links, infer hidden product quality, or invent missing facts.',
    'Give an overview of what the project is and highlight the project features visible from the submission.',
    'Include the exact submitted Repository URL in repositoryUrl; use "Not provided" if there is no repository URL.',
    'Explain the qualityScore in scoreRationale using details from this specific submission. State what earned points and what held the score back.',
    'Do not write generic score reasons. Avoid unsupported phrases like "topic is common" unless the submitted title/description clearly supports that and you explain what makes it common.',
    'Use needs_manual_review only when a human must resolve unclear evidence, failed validation, or concrete risks before approval.',
    'A valid repository URL is required for approval; missing or invalid repository evidence must stay in manual review.',
    'If all validation signals pass, there are no substantive risk flags, and the project is clear enough to showcase, recommend approve even when the score is 7 or 8.',
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
              text: SHOWCASE_REVIEW_SYSTEM_PROMPT,
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
