import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { requireApprovedAdmin } from '@/lib/auth/session'
import { handleCloudinarySignRequest } from '@/lib/cloudinary/signing-handler'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST (request: Request) {
  let kind: unknown = null
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json() as { kind?: unknown }
      kind = body?.kind ?? null
    } else {
      const url = new URL(request.url)
      kind = url.searchParams.get('kind')
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const result = await handleCloudinarySignRequest(
    {
      kind,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    {
      requireApprovedAdmin,
      signRequest: (params, apiSecret) => cloudinary.utils.api_sign_request(params, apiSecret),
    }
  )

  return NextResponse.json(result.body, { status: result.status })
}
