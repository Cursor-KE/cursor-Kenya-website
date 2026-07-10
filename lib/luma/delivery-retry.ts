export const LUMA_WEBHOOK_PROCESSING_RETRY_DELAY_MS = 5 * 60 * 1000

export type LumaWebhookDeliveryStatus = 'processing' | 'processed' | 'ignored' | 'failed'
export type LumaWebhookDuplicateAction = 'acknowledge' | 'claim' | 'retry'

type LumaWebhookDeliverySnapshot = {
  status: LumaWebhookDeliveryStatus
  receivedAt: Date
}

export function getLumaWebhookDuplicateAction (
  delivery: LumaWebhookDeliverySnapshot | null,
  now = new Date()
): LumaWebhookDuplicateAction {
  if (!delivery) return 'retry'

  switch (delivery.status) {
    case 'processed':
    case 'ignored':
      return 'acknowledge'
    case 'failed':
      return 'claim'
    case 'processing': {
      const ageMs = now.getTime() - delivery.receivedAt.getTime()
      return ageMs >= LUMA_WEBHOOK_PROCESSING_RETRY_DELAY_MS ? 'claim' : 'retry'
    }
    default:
      delivery.status satisfies never
      return 'retry'
  }
}
