import { nanoid } from 'nanoid'
import {
  generatedFormDraftInputSchema,
  generatedFormDraftJsonSchema,
  generatedFormDraftSchema,
  type GeneratedFormDraft,
  type GeneratedFormDraftInput,
} from '@/lib/ai/form-generation-schema'
import { ensureFormSlug } from '@/lib/forms/slug'

export type { GeneratedFormDraft } from '@/lib/ai/form-generation-schema'

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const FORM_GENERATION_PROMPT_VERSION = 'form-generation-v1'

export class FormGenerationConfigError extends Error {}
export class FormGenerationOutputError extends Error {}
export class FormGenerationUpstreamError extends Error {}

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

export function isFormGenerationConfigured () {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function getFormGenerationModel () {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL
}

export function buildFormGenerationPrompt (prompt: string) {
  return [
    'You are generating an internal admin form draft for Cursor Kenya.',
    'Return only data that fits the schema exactly.',
    'Generate a complete draft: title, slug suggestion, and blocks.',
    'Allowed block types are only short_text, long_text, and select.',
    'Every block must include a required boolean.',
    'Use select only when a fixed list of options is clearly appropriate.',
    'Keep labels concise and practical for a public-facing form.',
    'Slug suggestions must be short, human-readable, and suitable for a URL path without a leading slash.',
    '',
    `Prompt version: ${FORM_GENERATION_PROMPT_VERSION}`,
    'Admin brief:',
    prompt,
  ].join('\n')
}

export function extractStructuredOutputText (payload: OpenAIResponsesApiPayload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.refusal === 'string' && content.refusal.trim()) {
        throw new FormGenerationOutputError(content.refusal)
      }
      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) {
        return content.text
      }
    }
  }

  throw new FormGenerationOutputError(payload.error?.message || 'The model did not return a structured form draft.')
}

export function finalizeGeneratedFormDraft (draft: GeneratedFormDraftInput): GeneratedFormDraft {
  const fallbackSlug = ensureFormSlug('', draft.title)
  const normalizedSlug = ensureFormSlug(draft.slug, draft.title, fallbackSlug)

  const normalizedDraft = {
    title: draft.title.trim(),
    slug: normalizedSlug,
    definition: {
      blocks: draft.blocks.map((block) => {
        const label = block.label.trim()
        if (block.type === 'select') {
          return {
            id: nanoid(),
            type: 'select' as const,
            label,
            required: block.required,
            options: block.options.map((option) => option.trim()).filter(Boolean),
          }
        }

        const placeholder = block.placeholder?.trim()
        return {
          id: nanoid(),
          type: block.type,
          label,
          required: block.required,
          ...(placeholder ? { placeholder } : {}),
        }
      }),
    },
  }

  return generatedFormDraftSchema.parse(normalizedDraft)
}

export async function generateFormDraft (prompt: string): Promise<GeneratedFormDraft> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new FormGenerationConfigError('OpenAI is not configured for AI form generation.')
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getFormGenerationModel(),
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'Generate a concise, usable form draft for an internal admin UI. Stay grounded in the admin brief and never add unsupported field types.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildFormGenerationPrompt(prompt),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'form_draft',
          strict: true,
          schema: generatedFormDraftJsonSchema,
        },
      },
    }),
  })

  const payload = (await response.json()) as OpenAIResponsesApiPayload
  if (!response.ok) {
    throw new FormGenerationUpstreamError(payload.error?.message || 'OpenAI request failed.')
  }

  const text = extractStructuredOutputText(payload)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new FormGenerationOutputError('The model returned invalid JSON.')
  }

  const validated = generatedFormDraftInputSchema.safeParse(parsed)
  if (!validated.success) {
    throw new FormGenerationOutputError('The model response did not match the form draft schema.')
  }

  return finalizeGeneratedFormDraft(validated.data)
}
