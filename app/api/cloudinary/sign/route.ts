import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { getCloudinaryUploadFolder } from '@/lib/cloudinary/folder'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST () {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 503 })
  }

  const folder = getCloudinaryUploadFolder()
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
  })
}
