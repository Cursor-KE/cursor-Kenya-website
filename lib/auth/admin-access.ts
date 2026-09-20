import 'server-only'

import { redirect } from 'next/navigation'
import { SESSION_UNAUTHORIZED, getOptionalCurrentUser } from '@/lib/auth/session'

export async function getApprovedAdminOrRedirect () {
  let currentUser: Awaited<ReturnType<typeof getOptionalCurrentUser>>

  try {
    currentUser = await getOptionalCurrentUser()
  } catch (error) {
    if (error instanceof Error && error.message === SESSION_UNAUTHORIZED) {
      redirect('/admin/login')
    }

    throw error
  }

  if (!currentUser) {
    redirect('/admin/login')
  }

  if (currentUser.user.adminStatus !== 'approved') {
    redirect('/admin/pending')
  }

  return currentUser
}
