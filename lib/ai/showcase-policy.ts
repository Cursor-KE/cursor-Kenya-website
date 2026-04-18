import type { ShowcaseReviewPolicyOutcome } from '@/db/schema'
import type { ShowcaseReviewResult } from '@/lib/ai/showcase-review-schema'
import type { ShowcaseValidationSignals } from '@/lib/showcase/validation'

export function evaluateShowcasePolicy (input: {
  status: 'pending' | 'approved' | 'rejected'
  validationSignals: ShowcaseValidationSignals
  review: ShowcaseReviewResult
}): ShowcaseReviewPolicyOutcome {
  const reasons: string[] = []

  if (input.status !== 'pending') {
    reasons.push('Only pending submissions can be auto-approved.')
  }
  if (!input.validationSignals.titleLengthOk) reasons.push('Title failed validation.')
  if (!input.validationSignals.descriptionLengthOk) reasons.push('Description length failed validation.')
  if (!input.validationSignals.descriptionWordCountOk) reasons.push('Description word count failed validation.')
  if (!input.validationSignals.builderNameLengthOk) reasons.push('Builder name failed validation.')
  if (!input.validationSignals.projectUrlOk) reasons.push('Project URL failed validation.')
  if (!input.validationSignals.repoUrlOk) reasons.push('Repository URL failed validation.')
  if (!input.validationSignals.screenshotCountOk) reasons.push('Screenshots failed validation.')
  if (input.validationSignals.duplicateScreenshots) reasons.push('Duplicate screenshots were submitted.')
  if (input.review.recommendation !== 'approve') reasons.push('AI did not recommend approval.')
  if (input.review.qualityScore < 8) reasons.push('Quality score is below the auto-approve threshold.')
  if (input.review.riskFlags.length > 0) reasons.push('Risk flags require manual review.')

  if (reasons.length > 0) {
    return {
      decisionMode: 'manual_review',
      autoAction: null,
      reasons,
    }
  }

  return {
    decisionMode: 'auto_approved',
    autoAction: 'approve',
    reasons: ['Policy allowed auto-approval for a strong, low-risk pending submission.'],
  }
}
