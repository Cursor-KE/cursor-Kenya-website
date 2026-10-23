export type LumaWebhookStoredDeliveryStatus = 'processing' | 'processed' | 'ignored' | 'failed'

export function isRetryableLumaWebhookDeliveryStatus (
  status: LumaWebhookStoredDeliveryStatus
): boolean {
  switch (status) {
    case 'failed':
      return true
    case 'ignored':
    case 'processed':
    case 'processing':
      return false
    default: {
      status satisfies never
      return false
    }
  }
}
