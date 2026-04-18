import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { getCloudinaryUploadFolder, type CloudinaryUploadKind } from '@/lib/cloudinary/folder'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function parseKind (value: unknown): CloudinaryUploadKind {
  return value === 'showcase' ? 'showcase' : 'gallery'
}

export async function POST (request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 503 })
  }

  let kind: CloudinaryUploadKind = 'gallery'
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json() as { kind?: unknown }
      kind = parseKind(body?.kind)
    } else {
      const url = new URL(request.url)
      kind = parseKind(url.searchParams.get('kind'))
    }
  } catch {
    kind = 'gallery'
  }

  const folder = getCloudinaryUploadFolder(kind)
  const timestamp = Math.round(Date.now() / 1000)
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret
  )

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    kind,
  })
}
