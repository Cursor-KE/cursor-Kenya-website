import { createHmac } from 'node:crypto'
import type { FormDefinition } from '@/lib/forms/types'

export const MAX_FORM_SUBMISSION_BYTES = 64_000
export const MAX_SHORT_TEXT_ANSWER_CHARS = 1_000
export const MAX_LONG_TEXT_ANSWER_CHARS = 20_000
export const MAX_TOTAL_ANSWER_CHARS = 50_000
export const FORM_SUBMISSION_RATE_LIMIT = 20
export const FORM_SUBMISSION_RATE_WINDOW_MS = 15 * 60_000

export class FormSubmissionInputError extends Error {
  status: number

  constructor (message: string, status: number) {
    super(message)
    this.name = 'FormSubmissionInputError'
    this.status = status
  }
}

type SubmissionBody = {
  slug: string
  answers: Record<string, unknown>
}

type ParseFormSubmissionBodyResult =
  | SubmissionBody
  | { ok: false; error: string; status: number }

export type NormalizeFormAnswersResult =
  | { ok: true; answers: Record<string, string> }
  | { ok: false; error: string; status: number }

function isRecord (value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function answerLimitForBlock (type: FormDefinition['blocks'][number]['type']): number {
  if (type === 'long_text') return MAX_LONG_TEXT_ANSWER_CHARS
  if (type === 'short_text') return MAX_SHORT_TEXT_ANSWER_CHARS
  return MAX_SHORT_TEXT_ANSWER_CHARS
}

function concatenateChunks (chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const buffer = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.byteLength
  }
  return buffer
}

export async function readFormSubmissionJson (request: Request): Promise<unknown> {
  const rawContentLength = request.headers.get('content-length')
  const contentLength = rawContentLength ? Number(rawContentLength) : 0
  if (Number.isFinite(contentLength) && contentLength > MAX_FORM_SUBMISSION_BYTES) {
    throw new FormSubmissionInputError('Submission is too large.', 413)
  }

  if (!request.body) return null

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    totalBytes += value.byteLength
    if (totalBytes > MAX_FORM_SUBMISSION_BYTES) {
      throw new FormSubmissionInputError('Submission is too large.', 413)
    }
    chunks.push(value)
  }

  if (totalBytes === 0) return null

  try {
    const text = new TextDecoder().decode(concatenateChunks(chunks, totalBytes))
    return JSON.parse(text)
  } catch {
    throw new FormSubmissionInputError('Invalid JSON payload.', 400)
  }
}

export function parseFormSubmissionBody (body: unknown): ParseFormSubmissionBodyResult {
  if (!isRecord(body)) {
    return { ok: false, error: 'Invalid submission payload.', status: 400 }
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!slug) {
    return { ok: false, error: 'Missing slug', status: 400 }
  }

  if (!isRecord(body.answers)) {
    return { slug, answers: {} }
  }

  return { slug, answers: body.answers }
}

export function normalizeFormAnswers (
  definition: FormDefinition,
  rawAnswers: Record<string, unknown>
): NormalizeFormAnswersResult {
  const allowedIds = new Set(definition.blocks.map((block) => block.id))
  for (const key of Object.keys(rawAnswers)) {
    if (!allowedIds.has(key)) {
      return {
        ok: false,
        error: 'This form changed before your submission was sent. Please refresh and try again.',
        status: 400,
      }
    }
  }

  const answers: Record<string, string> = {}
  let totalAnswerChars = 0

  for (const block of definition.blocks) {
    const rawValue = rawAnswers[block.id]
    const value = typeof rawValue === 'string' ? rawValue.trim() : ''

    if (block.required && !value) {
      return { ok: false, error: `Required: ${block.label}`, status: 400 }
    }

    if (!value) continue

    if (block.type === 'select' && !block.options.includes(value)) {
      return { ok: false, error: `Choose a valid option for ${block.label}.`, status: 400 }
    }

    if (value.length > answerLimitForBlock(block.type)) {
      return { ok: false, error: `${block.label} is too long.`, status: 400 }
    }

    totalAnswerChars += value.length
    if (totalAnswerChars > MAX_TOTAL_ANSWER_CHARS) {
      return { ok: false, error: 'Submission is too large.', status: 413 }
    }

    answers[block.id] = value
  }

  return { ok: true, answers }
}

export function hashFormSubmissionValue (value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? 'development-only-form-secret'
  return createHmac('sha256', secret).update(value).digest('hex')
}
