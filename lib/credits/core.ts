import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'
import { z } from 'zod'

export const MAX_CSV_BYTES = 1_000_000
export const MAX_CSV_ROWS = 5_000
export const VERIFICATION_TTL_MINUTES = 10
export const VERIFICATION_MAX_ATTEMPTS = 5

export function canCreateCreditCampaign (role: 'super_user' | 'admin'): boolean {
  return role === 'super_user'
}

export const emailSchema = z.string().trim().toLowerCase().email().max(320)
export const slugSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only.')
  .min(2).max(80)

export function normalizeEmail (email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeCredit (value: string): string {
  return value.trim()
}

export function creditFingerprint (value: string): string {
  return createHash('sha256').update(normalizeCredit(value), 'utf8').digest('hex')
}

export function maskCredit (value: string): string {
  const normalized = normalizeCredit(value)
  if (normalized.length <= 8) return `${normalized.slice(0, 2)}••••${normalized.slice(-2)}`
  return `${normalized.slice(0, 5)}••••••${normalized.slice(-4)}`
}

function encryptionKey (): Buffer | null {
  const raw = process.env.CREDIT_ENCRYPTION_KEY?.trim()
  return raw ? createHash('sha256').update(raw, 'utf8').digest() : null
}

export function protectCredit (value: string): string {
  const normalized = normalizeCredit(value)
  const key = encryptionKey()
  if (!key) return `plain:${Buffer.from(normalized, 'utf8').toString('base64')}`
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()])
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${body.toString('base64')}`
}

export function revealCredit (stored: string): string {
  if (stored.startsWith('plain:')) return Buffer.from(stored.slice(6), 'base64').toString('utf8')
  const [version, ivRaw, tagRaw, bodyRaw] = stored.split(':')
  const key = encryptionKey()
  if (version !== 'v1' || !ivRaw || !tagRaw || !bodyRaw || !key) {
    throw new Error('Credit value cannot be decrypted with the configured key.')
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(bodyRaw, 'base64')), decipher.final()]).toString('utf8')
}

export function hashVerificationValue (value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? 'development-only-credit-secret'
  return createHmac('sha256', secret).update(value).digest('hex')
}

function parseCsvLine (line: string): string[] {
  const values: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"'
      index++
    } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else value += char
  }
  values.push(value.trim())
  return values
}

export type CsvPreview<T> = {
  rows: Array<{ row: number; value: T }>
  errors: Array<{ row: number; message: string }>
  duplicates: number
}

function csvRecords (csv: string): { headers: string[]; rows: Array<{ row: number; record: Record<string, string> }> } {
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) throw new Error('CSV exceeds the 1 MB limit.')
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length < 2) throw new Error('CSV must contain a header and at least one row.')
  if (lines.length - 1 > MAX_CSV_ROWS) throw new Error(`CSV exceeds the ${MAX_CSV_ROWS.toLocaleString()} row limit.`)
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    return { row: index + 2, record: Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])) }
  })
  return { headers, rows }
}

export function previewGuestCsv (csv: string): CsvPreview<{ email: string; name?: string; externalId?: string }> {
  const { headers, rows } = csvRecords(csv)
  if (!headers.includes('email')) throw new Error('Guest CSV requires an email column.')
  const seen = new Set<string>()
  const result: CsvPreview<{ email: string; name?: string; externalId?: string }> = { rows: [], errors: [], duplicates: 0 }
  for (const { row, record } of rows) {
    const parsed = emailSchema.safeParse(record.email)
    if (!parsed.success) result.errors.push({ row, message: 'Invalid email address.' })
    else if (seen.has(parsed.data)) result.duplicates++
    else {
      seen.add(parsed.data)
      result.rows.push({ row, value: { email: parsed.data, name: record.name || undefined, externalId: record.external_id || undefined } })
    }
  }
  return result
}

export function previewInventoryCsv (csv: string): CsvPreview<{ credit: string; label?: string; expiresAt?: Date }> {
  const { headers, rows } = csvRecords(csv)
  if (!headers.includes('credit')) throw new Error('Inventory CSV requires a credit column.')
  const seen = new Set<string>()
  const result: CsvPreview<{ credit: string; label?: string; expiresAt?: Date }> = { rows: [], errors: [], duplicates: 0 }
  for (const { row, record } of rows) {
    const credit = normalizeCredit(record.credit)
    const fingerprint = creditFingerprint(credit)
    const expiresAt = record.expires_at ? new Date(record.expires_at) : undefined
    if (!credit) result.errors.push({ row, message: 'Credit is required.' })
    else if (expiresAt && Number.isNaN(expiresAt.getTime())) result.errors.push({ row, message: 'Invalid expires_at date.' })
    else if (seen.has(fingerprint)) result.duplicates++
    else {
      seen.add(fingerprint)
      result.rows.push({ row, value: { credit, label: record.label || undefined, expiresAt } })
    }
  }
  return result
}
