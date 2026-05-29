import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FORM_GENERATION_PROMPT_VERSION,
  FormGenerationConfigError,
  FormGenerationOutputError,
  FormGenerationUpstreamError,
  buildFormGenerationPrompt,
  extractStructuredOutputText,
  finalizeGeneratedFormDraft,
  generateFormDraft,
} from '../lib/ai/form-generation.ts'
import {
  ADMIN_FORBIDDEN,
  SESSION_UNAUTHORIZED,
  handleFormGenerationRequest,
} from '../lib/ai/form-generation-handler.ts'
import { generatedFormDraftInputSchema } from '../lib/ai/form-generation-schema.ts'
import { ensureFormSlug, normalizeFormSlug } from '../lib/forms/slug.ts'
import { formDefinitionSchema } from '../lib/forms/types.ts'

const originalFetch = globalThis.fetch
const originalApiKey = process.env.OPENAI_API_KEY
const originalModel = process.env.OPENAI_MODEL

const validModelDraft = {
  title: 'Event Registration',
  slug: 'event registration',
  blocks: [
    {
      type: 'short_text',
      label: 'Full name',
      required: true,
      placeholder: 'Ada Lovelace',
    },
    {
      type: 'select',
      label: 'Experience level',
      required: true,
      options: ['Beginner', 'Intermediate', 'Advanced'],
    },
    {
      type: 'long_text',
      label: 'What do you want to learn?',
      required: false,
      placeholder: 'Share your goals',
    },
  ],
} satisfies Parameters<typeof finalizeGeneratedFormDraft>[0]

function restoreGlobals () {
  globalThis.fetch = originalFetch
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalApiKey
  if (originalModel === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = originalModel
}

test('prompt builder includes the prompt version and admin brief', () => {
  const prompt = buildFormGenerationPrompt('Create a meetup registration form.')
  assert.match(prompt, new RegExp(FORM_GENERATION_PROMPT_VERSION))
  assert.match(prompt, /Allowed block types are only short_text, long_text, and select/)
  assert.match(prompt, /Create a meetup registration form/)
})

test('structured output extractor prefers output_text and rejects refusals', () => {
  const outputText = extractStructuredOutputText({
    output_text: JSON.stringify(validModelDraft),
  })
  assert.equal(outputText, JSON.stringify(validModelDraft))

  assert.throws(
    () =>
      extractStructuredOutputText({
        output: [
          {
            content: [{ refusal: 'Refused for safety reasons.' }],
          },
        ],
      }),
    FormGenerationOutputError
  )
})

test('slug normalization collapses punctuation and falls back when empty', () => {
  assert.equal(normalizeFormSlug('  Kenya Meetup Registration!  '), 'kenya-meetup-registration')
  assert.equal(ensureFormSlug('!!!', 'Weekly Sync', 'fallback-slug'), 'weekly-sync')
  assert.equal(ensureFormSlug('!!!', '', 'fallback-slug'), 'fallback-slug')
})

test('generated schema rejects select blocks without usable options', () => {
  const parsed = generatedFormDraftInputSchema.safeParse({
    ...validModelDraft,
    blocks: [
      {
        type: 'select',
        label: 'Track',
        required: true,
        options: [],
      },
    ],
  })

  assert.equal(parsed.success, false)
})

test('finalized drafts preserve required flags and produce a valid form definition', () => {
  const draft = finalizeGeneratedFormDraft(validModelDraft)
  const parsed = formDefinitionSchema.parse(draft.definition)

  assert.equal(draft.slug, 'event-registration')
  assert.equal(parsed.blocks[0]?.required, true)
  assert.equal(parsed.blocks[1]?.required, true)
  assert.equal(parsed.blocks[2]?.required, false)
  assert.ok(parsed.blocks.every((block) => typeof block.id === 'string' && block.id.length > 0))
})

test('request handler rejects unauthenticated and unauthorized access', async () => {
  const unauthenticated = await handleFormGenerationRequest(
    { prompt: 'Create a form' },
    {
      requireSession: async () => {
        throw new Error(SESSION_UNAUTHORIZED)
      },
      generateDraft: async () => finalizeGeneratedFormDraft(validModelDraft),
    }
  )

  assert.equal(unauthenticated.status, 401)
  assert.ok('error' in unauthenticated.body)

  const forbidden = await handleFormGenerationRequest(
    { prompt: 'Create a form' },
    {
      requireSession: async () => {
        throw new Error(ADMIN_FORBIDDEN)
      },
      generateDraft: async () => finalizeGeneratedFormDraft(validModelDraft),
    }
  )

  assert.equal(forbidden.status, 403)
  assert.ok('error' in forbidden.body)
})

test('request handler validates missing prompt', async () => {
  const result = await handleFormGenerationRequest(
    {},
    {
      requireSession: async () => ({ user: { id: 'user_1' } }),
      generateDraft: async () => finalizeGeneratedFormDraft(validModelDraft),
    }
  )

  assert.equal(result.status, 400)
  assert.ok('error' in result.body)
})

test('request handler maps configuration and invalid output failures', async () => {
  const baseDeps = {
    requireSession: async () => ({ user: { id: 'user_1' } }),
  }

  const missingConfig = await handleFormGenerationRequest(
    { prompt: 'Create a form' },
    {
      ...baseDeps,
      generateDraft: async () => {
        throw new FormGenerationConfigError('OpenAI is not configured for AI form generation.')
      },
    }
  )
  assert.equal(missingConfig.status, 503)

  const invalidOutput = await handleFormGenerationRequest(
    { prompt: 'Create a form' },
    {
      ...baseDeps,
      generateDraft: async () => {
        throw new FormGenerationOutputError('The model response did not match the form draft schema.')
      },
    }
  )
  assert.equal(invalidOutput.status, 502)

  const upstreamFailure = await handleFormGenerationRequest(
    { prompt: 'Create a form' },
    {
      ...baseDeps,
      generateDraft: async () => {
        throw new FormGenerationUpstreamError('Rate limit exceeded.')
      },
    }
  )
  assert.equal(upstreamFailure.status, 502)
  assert.ok('error' in upstreamFailure.body)
  assert.match(upstreamFailure.body.error, /Rate limit exceeded\./)
  assert.match(upstreamFailure.body.error, /try again/i)
})

test('request handler returns a generated draft on success', async () => {
  const draft = finalizeGeneratedFormDraft(validModelDraft)
  const result = await handleFormGenerationRequest(
    { prompt: 'Create a form' },
    {
      requireSession: async () => ({ user: { id: 'user_1' } }),
      generateDraft: async () => draft,
    }
  )

  assert.equal(result.status, 200)
  assert.ok('draft' in result.body)
  assert.deepEqual(result.body.draft, draft)
})

test('service rejects missing configuration', async () => {
  restoreGlobals()
  delete process.env.OPENAI_API_KEY

  await assert.rejects(
    () => generateFormDraft('Create a form'),
    FormGenerationConfigError
  )
})

test('service rejects invalid model output', async () => {
  restoreGlobals()
  process.env.OPENAI_API_KEY = 'test-key'
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          title: 'Broken draft',
          slug: 'broken-draft',
          blocks: [],
        }),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  await assert.rejects(
    () => generateFormDraft('Create a form'),
    FormGenerationOutputError
  )

  restoreGlobals()
})

test('service generates a full form draft from a valid OpenAI response', async () => {
  restoreGlobals()
  process.env.OPENAI_API_KEY = 'test-key'
  process.env.OPENAI_MODEL = 'gpt-test'
  globalThis.fetch = async (input, init) => {
    assert.equal(input, 'https://api.openai.com/v1/responses')
    assert.ok(init?.body)
    const payload = JSON.parse(String(init.body)) as { model: string }
    assert.equal(payload.model, 'gpt-test')

    return new Response(
      JSON.stringify({
        output_text: JSON.stringify(validModelDraft),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const draft = await generateFormDraft('Create a form')
  assert.equal(draft.title, 'Event Registration')
  assert.equal(draft.slug, 'event-registration')
  assert.equal(draft.definition.blocks.length, 3)
  assert.equal(draft.definition.blocks[0]?.required, true)

  restoreGlobals()
})
