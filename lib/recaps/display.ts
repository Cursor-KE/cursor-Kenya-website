export function recapReadingMinutes (content: string): number {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 220))
}

export const recapDateFormatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
