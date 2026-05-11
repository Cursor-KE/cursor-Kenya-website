export const SHOWCASE_TITLE_MIN = 8
export const SHOWCASE_TITLE_MAX = 120
/** Character bounds sized for a short pitch (roughly 8–16 words). */
export const SHOWCASE_DESC_MIN = 55
export const SHOWCASE_DESC_MAX = 420
export const SHOWCASE_DESC_MIN_WORDS = 8
export const SHOWCASE_DESC_MAX_WORDS = 16
export const SHOWCASE_NAME_MIN = 2
export const SHOWCASE_NAME_MAX = 80
export const SHOWCASE_URL_MAX = 2048
export const SHOWCASE_SCREENSHOT_MIN = 2
export const SHOWCASE_SCREENSHOT_MAX = 8

export type ShowcaseValidationSignals = {
  titleLengthOk: boolean
  descriptionLengthOk: boolean
  descriptionWordCountOk: boolean
  builderNameLengthOk: boolean
  projectUrlOk: boolean
  repoUrlOk: boolean
  screenshotCountOk: boolean
  duplicateScreenshots: boolean
}

export type ShowcaseSubmissionInput = {
  title: string
  description: string
  projectUrl: string
  repoUrl?: string | null
  builderName: string
  screenshotUrls: string[]
}

export function isHttpUrl (raw: string) {
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function isHttpsUrl (raw: string) {
  if (!isHttpUrl(raw)) return false
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

export function countWords (value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

/** Inline error for the description field; `null` when valid. Empty input returns `null` (use required / blur messaging in the form). */
export function getDescriptionFieldError (raw: string): string | null {
  const d = raw.trim()
  if (d.length === 0) return null
  const words = countWords(d)
  const len = d.length
  if (words > SHOWCASE_DESC_MAX_WORDS) {
    return `Use at most ${SHOWCASE_DESC_MAX_WORDS} words (you have ${words}).`
  }
  if (words < SHOWCASE_DESC_MIN_WORDS) {
    return `Use at least ${SHOWCASE_DESC_MIN_WORDS} words (you have ${words}).`
  }
  if (len > SHOWCASE_DESC_MAX) {
    return `Use at most ${SHOWCASE_DESC_MAX} characters.`
  }
  if (len < SHOWCASE_DESC_MIN) {
    return `Use at least ${SHOWCASE_DESC_MIN} characters (you have ${len}).`
  }
  return null
}

export function getShowcaseValidationSignals (input: ShowcaseSubmissionInput): ShowcaseValidationSignals {
  const title = input.title.trim()
  const description = input.description.trim()
  const builderName = input.builderName.trim()
  const projectUrl = input.projectUrl.trim()
  const repoUrl = input.repoUrl?.trim() ?? ''
  const screenshotUrls = input.screenshotUrls.map((u) => u.trim()).filter(Boolean)
  const uniqueScreenshots = new Set(screenshotUrls)

  return {
    titleLengthOk: title.length >= SHOWCASE_TITLE_MIN && title.length <= SHOWCASE_TITLE_MAX,
    descriptionLengthOk: description.length >= SHOWCASE_DESC_MIN && description.length <= SHOWCASE_DESC_MAX,
    descriptionWordCountOk:
      countWords(description) >= SHOWCASE_DESC_MIN_WORDS &&
      countWords(description) <= SHOWCASE_DESC_MAX_WORDS,
    builderNameLengthOk: builderName.length >= SHOWCASE_NAME_MIN && builderName.length <= SHOWCASE_NAME_MAX,
    projectUrlOk: Boolean(projectUrl) && projectUrl.length <= SHOWCASE_URL_MAX && isHttpUrl(projectUrl),
    repoUrlOk: !repoUrl || (repoUrl.length <= SHOWCASE_URL_MAX && isHttpUrl(repoUrl)),
    screenshotCountOk:
      screenshotUrls.length >= SHOWCASE_SCREENSHOT_MIN &&
      screenshotUrls.length <= SHOWCASE_SCREENSHOT_MAX &&
      screenshotUrls.every((u) => u.length <= SHOWCASE_URL_MAX && isHttpsUrl(u)),
    duplicateScreenshots: uniqueScreenshots.size !== screenshotUrls.length,
  }
}

export function getBlockingValidationIssues (signals: ShowcaseValidationSignals) {
  const issues: string[] = []
  if (!signals.titleLengthOk) issues.push('Title does not meet the required length.')
  if (!signals.descriptionLengthOk) issues.push('Description does not meet the required character length.')
  if (!signals.descriptionWordCountOk) {
    issues.push('Description must stay within the allowed word count (see submission guidelines).')
  }
  if (!signals.builderNameLengthOk) issues.push('Builder name does not meet the required length.')
  if (!signals.projectUrlOk) issues.push('Project URL must be a valid http(s) link.')
  if (!signals.repoUrlOk) issues.push('Repository URL must be a valid http(s) link.')
  if (!signals.screenshotCountOk) issues.push('Screenshot set must include 2 to 8 valid https URLs.')
  if (signals.duplicateScreenshots) issues.push('Screenshot URLs must be unique.')
  return issues
}
