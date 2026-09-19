import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  isLumaWebhookAuthConfigured,
  processLumaWebhookBody,
  verifyLumaWebhookSignature,
  verifyLumaWebhookToken,
} from '@/lib/luma/webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST (request: Request) {
  if (!isLumaWebhookAuthConfigured()) {
    return NextResponse.json({ error: 'Webhook authentication is not configured' }, { status: 503 })
  }

  if (!verifyLumaWebhookToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.text()
  if (!rawBody) {
    return NextResponse.json({ error: 'Missing webhook body' }, { status: 400 })
  }

  if (!verifyLumaWebhookSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  try {
    const result = await processLumaWebhookBody(rawBody)
    if (result.retry) {
      return NextResponse.json({ error: 'Webhook delivery is still processing', ...result }, { status: 503 })
    }

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
