import 'server-only'

import { redirect } from 'next/navigation'
import {
  ADMIN_APPROVAL_REQUIRED,
  ADMIN_FORBIDDEN,
  SESSION_UNAUTHORIZED,
  requireApprovedAdmin,
  requireSuperUser,
} from '@/lib/auth/session'

function redirectForAdminError (error: unknown, forbiddenPath = '/admin/pending'): never {
  if (error instanceof Error && error.message === SESSION_UNAUTHORIZED) {
    redirect('/admin/login')
  }

  if (error instanceof Error && error.message === ADMIN_APPROVAL_REQUIRED) {
    redirect('/admin/pending')
  }

  if (error instanceof Error && error.message === ADMIN_FORBIDDEN) {
    redirect(forbiddenPath)
  }

  throw error
}

export async function requireApprovedAdminOrRedirect () {
  try {
    return await requireApprovedAdmin()
  } catch (error) {
    redirectForAdminError(error)
  }
}

export async function requireSuperUserOrRedirect (forbiddenPath = '/admin/pending') {
  try {
    return await requireSuperUser()
  } catch (error) {
    redirectForAdminError(error, forbiddenPath)
  }
}
