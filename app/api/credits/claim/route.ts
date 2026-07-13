import { NextResponse } from 'next/server'
import { z } from 'zod'
import { claimCredit } from '@/lib/credits/claim-service'
import { slugSchema } from '@/lib/credits/core'

const claimSchema = z.object({
  verificationId: z.string().min(8).max(100),
  code: z.string().regex(/^\d{6}$/),
  campaignSlug: slugSchema,
  providerSlug: slugSchema,
})

export async function POST (request: Request) {
  const parsed = claimSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Check the verification code and try again.' }, { status: 400 })
  return NextResponse.json(await claimCredit(parsed.data))
}
