import { NextResponse } from 'next/server'
import {
  createShowcaseReviewDeps,
  handleShowcaseBatchReviewRequest,
} from '@/lib/ai/showcase-review-service'

export async function POST (req: Request) {
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const result = await handleShowcaseBatchReviewRequest(body, createShowcaseReviewDeps())
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('[showcase-review-batch]', error)
    return NextResponse.json(
      { error: 'Could not complete the batch showcase review right now.' },
      { status: 500 }
    )
  }
}
