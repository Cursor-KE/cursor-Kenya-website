import { NextResponse } from 'next/server'
import { generateFormDraft } from '@/lib/ai/form-generation'
import { handleFormGenerationRequest } from '@/lib/ai/form-generation-handler'
import { requireApprovedAdmin } from '@/lib/auth/session'

export async function POST (req: Request) {
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const result = await handleFormGenerationRequest(body, {
      requireSession: requireApprovedAdmin,
      generateDraft: generateFormDraft,
    })
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('[form-generation]', error)
    return NextResponse.json(
      { error: 'Could not generate a form draft right now.' },
      { status: 500 }
    )
  }
}
