import { NextResponse } from 'next/server'
import {
  createShowcaseReviewDeps,
  handleShowcaseReviewRequest,
} from '@/lib/ai/showcase-review-service'

export async function POST (req: Request) {
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const result = await handleShowcaseReviewRequest(body, createShowcaseReviewDeps())
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('[showcase-review]', error)
    return NextResponse.json(
      { error: 'Could not complete the showcase review right now.' },
      { status: 500 }
    )
  }
}
