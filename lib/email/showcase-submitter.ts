import 'server-only'

import { sendEmail } from '@/lib/email/nodemailer'

type ShowcaseEmailBase = {
  to: string
  builderName: string
  title: string
}

function escapeHtml (value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function greeting (builderName: string) {
  return builderName ? `Hi ${builderName},` : 'Hi,'
}

export async function sendShowcaseSubmissionAck (input: ShowcaseEmailBase & {
  showcaseId: string
}): Promise<boolean> {
  const safeName = escapeHtml(input.builderName)
  const safeTitle = escapeHtml(input.title)
  const text = [
    greeting(input.builderName),
    '',
    `We received your community showcase submission, "${input.title}".`,
    'The team will review it before it appears publicly.',
    '',
    `Submission ID: ${input.showcaseId}`,
  ].join('\n')

  return sendEmail({
    to: input.to,
    subject: `We received your showcase submission: ${input.title}`,
    text,
    html: [
      `<p>${greeting(safeName)}</p>`,
      `<p>We received your community showcase submission, <strong>${safeTitle}</strong>.</p>`,
      '<p>The team will review it before it appears publicly.</p>',
      `<p><strong>Submission ID:</strong> ${escapeHtml(input.showcaseId)}</p>`,
    ].join(''),
  })
}

export async function sendShowcaseAiSummary (input: ShowcaseEmailBase & {
  qualityScore: number
  summary: string
}): Promise<boolean> {
  const safeName = escapeHtml(input.builderName)
  const safeTitle = escapeHtml(input.title)
  const safeSummary = escapeHtml(input.summary)
  const text = [
    greeting(input.builderName),
    '',
    `Our automated review finished for "${input.title}".`,
    `Quality score: ${input.qualityScore}/10`,
    '',
    input.summary,
    '',
    'This score helps the team review submissions. A moderator still makes the final publishing decision.',
  ].join('\n')

  return sendEmail({
    to: input.to,
    subject: `Showcase review score for ${input.title}`,
    text,
    html: [
      `<p>${greeting(safeName)}</p>`,
      `<p>Our automated review finished for <strong>${safeTitle}</strong>.</p>`,
      `<p><strong>Quality score:</strong> ${input.qualityScore}/10</p>`,
      `<p>${safeSummary}</p>`,
      '<p>This score helps the team review submissions. A moderator still makes the final publishing decision.</p>',
    ].join(''),
  })
}
