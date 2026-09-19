import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  isLumaWebhookSignatureConfigured,
  isLumaWebhookTokenConfigured,
  processLumaWebhookBody,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
} from '@/lib/luma/webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST (request: Request) {
  const hasRouteToken = isLumaWebhookTokenConfigured()
  const hasSignatureSecret = isLumaWebhookSignatureConfigured()

  if (!hasRouteToken && !hasSignatureSecret) {
    return NextResponse.json({ error: 'Luma webhook authentication is not configured' }, { status: 503 })
  }

  if (hasRouteToken && !verifyLumaWebhookToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.text()
  if (!rawBody) {
    return NextResponse.json({ error: 'Missing webhook body' }, { status: 400 })
  }

  if (hasSignatureSecret && !verifyLumaWebhookSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  try {
    const result = await processLumaWebhookBody(rawBody)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    console.error('Luma webhook processing failed', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export async function GET () {
  return NextResponse.json({ ok: true, service: 'luma-webhook' })
}
