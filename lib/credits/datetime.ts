const CREDIT_TIME_ZONE = 'Africa/Nairobi'
const CREDIT_TIME_ZONE_OFFSET = '+03:00'
const datetimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const nairobiDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CREDIT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function dateTimeParts (date: Date): Record<string, string> {
  return Object.fromEntries(
    nairobiDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
}

export function formatCreditDateTimeLocal (value: Date | string | null | undefined): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = dateTimeParts(date)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function parseCreditDateTimeLocal (value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!datetimeLocalPattern.test(trimmed)) {
    throw new Error('Enter a valid date and time.')
  }

  const parsed = new Date(`${trimmed}:00${CREDIT_TIME_ZONE_OFFSET}`)
  if (Number.isNaN(parsed.getTime()) || formatCreditDateTimeLocal(parsed) !== trimmed) {
    throw new Error('Enter a valid date and time.')
  }

  return parsed
}
