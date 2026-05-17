import {
  FormGenerationConfigError,
  FormGenerationOutputError,
  FormGenerationUpstreamError,
  type GeneratedFormDraft,
} from '@/lib/ai/form-generation'

export const SESSION_DB_UNAVAILABLE = 'SESSION_DB_UNAVAILABLE'
export const SESSION_UNAUTHORIZED = 'SESSION_UNAUTHORIZED'
export const ADMIN_APPROVAL_REQUIRED = 'ADMIN_APPROVAL_REQUIRED'
export const ADMIN_FORBIDDEN = 'ADMIN_FORBIDDEN'

type FormGenerationSuccess = {
  status: number
  body: { draft: GeneratedFormDraft }
}

type FormGenerationFailure = {
  status: number
  body: { error: string }
}

export type FormGenerationResponse = FormGenerationSuccess | FormGenerationFailure

export type FormGenerationDeps = {
  requireSession: () => Promise<unknown>
  generateDraft: (prompt: string) => Promise<GeneratedFormDraft>
}

function handleSharedError (error: unknown): FormGenerationFailure | null {
  if (error instanceof Error && error.message === SESSION_UNAUTHORIZED) {
    return { status: 401, body: { error: 'You must be signed in to generate form drafts.' } }
  }
  if (error instanceof Error && error.message === SESSION_DB_UNAVAILABLE) {
    return { status: 503, body: { error: 'Could not verify your session because the database is unavailable.' } }
  }
  if (error instanceof Error && error.message === ADMIN_APPROVAL_REQUIRED) {
    return { status: 403, body: { error: 'Your admin account is still waiting for super-user approval.' } }
  }
  if (error instanceof Error && error.message === ADMIN_FORBIDDEN) {
    return { status: 403, body: { error: 'You do not have permission to generate form drafts.' } }
  }
  if (error instanceof FormGenerationConfigError) {
    return { status: 503, body: { error: error.message } }
  }
  if (error instanceof FormGenerationOutputError) {
    return { status: 502, body: { error: error.message } }
  }
  if (error instanceof FormGenerationUpstreamError) {
    return {
      status: 502,
      body: {
        error: `The AI service is temporarily unavailable: ${error.message}. Please try again in a moment.`,
      },
    }
  }
  return null
}

export async function handleFormGenerationRequest (
  body: unknown,
  deps: FormGenerationDeps
): Promise<FormGenerationResponse> {
  try {
    await deps.requireSession()
    const prompt = typeof (body as { prompt?: unknown } | null)?.prompt === 'string'
      ? (body as { prompt: string }).prompt.trim()
      : ''

    if (!prompt) {
      return { status: 400, body: { error: 'Missing prompt.' } }
    }

    const draft = await deps.generateDraft(prompt)
    return { status: 200, body: { draft } }
  } catch (error) {
    const handled = handleSharedError(error)
    if (handled) return handled
    throw error
  }
}
