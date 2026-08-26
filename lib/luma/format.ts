export const EVENT_TIME_ZONE = 'Africa/Nairobi'

const dateTimeFormatter = new Intl.DateTimeFormat('en-KE', {
  timeZone: EVENT_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const timeFormatter = new Intl.DateTimeFormat('en-KE', {
  timeZone: EVENT_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const calendarDayFormatter = new Intl.DateTimeFormat('en-KE', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function calendarDayKey (date: Date) {
  return calendarDayFormatter
    .formatToParts(date)
    .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
    .map((part) => `${part.type}:${part.value}`)
    .join('|')
}

export function formatEventRange (start: string, end: string | null) {
  const startDate = new Date(start)
  if (!end) return dateTimeFormatter.format(startDate)

  const endDate = new Date(end)
  const endLabel = calendarDayKey(startDate) === calendarDayKey(endDate)
    ? timeFormatter.format(endDate)
    : dateTimeFormatter.format(endDate)

  return `${dateTimeFormatter.format(startDate)} — ${endLabel}`
}
