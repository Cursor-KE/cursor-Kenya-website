import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { emailSchema, slugSchema } from '@/lib/credits/core'
import { GENERIC_VERIFICATION_MESSAGE, requestClaimVerification } from '@/lib/credits/claim-service'

const requestSchema = z.object({ campaignSlug: slugSchema, email: emailSchema })

export async function POST (request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: true, message: GENERIC_VERIFICATION_MESSAGE })
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? requestHeaders.get('x-real-ip') ?? 'unknown'
  return NextResponse.json(await requestClaimVerification({ ...parsed.data, ip }))
}
