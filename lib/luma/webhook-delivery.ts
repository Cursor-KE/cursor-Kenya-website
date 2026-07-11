import 'server-only'

export const LUMA_WEBHOOK_PROCESSING_STALE_MS = 5 * 60 * 1000

type LumaDeliveryStatus = 'processing' | 'processed' | 'ignored' | 'failed'

export function isRetryableLumaDelivery (
  status: LumaDeliveryStatus,
  receivedAt: Date,
  now: Date = new Date()
): boolean {
  if (status === 'failed') return true
  if (status !== 'processing') return false

  return now.getTime() - receivedAt.getTime() > LUMA_WEBHOOK_PROCESSING_STALE_MS
}
