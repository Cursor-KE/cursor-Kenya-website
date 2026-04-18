import 'server-only'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/db'
import { user } from '@/db/schema'
import { auth } from '@/lib/auth'

export const SESSION_DB_UNAVAILABLE = 'SESSION_DB_UNAVAILABLE'
export const SESSION_UNAUTHORIZED = 'SESSION_UNAUTHORIZED'
export const ADMIN_APPROVAL_REQUIRED = 'ADMIN_APPROVAL_REQUIRED'
export const ADMIN_FORBIDDEN = 'ADMIN_FORBIDDEN'

function isDatabaseConnectivityError (err: unknown): boolean {
  const chunk = (e: unknown) => (e instanceof Error ? `${e.message} ${e.cause ?? ''}` : String(e))
  const full = chunk(err)
  if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENOTFOUND|Failed query|get session/i.test(full)) {
    return true
  }
  if (err instanceof AggregateError && Array.isArray(err.errors)) {
    return err.errors.some((e) => isDatabaseConnectivityError(e))
  }
  if (err instanceof Error && err.cause) {
    return isDatabaseConnectivityError(err.cause)
  }
  return false
}

function sleep (ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getSessionWithRetry () {
  const hdrs = await headers()
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      session = await auth.api.getSession({ headers: hdrs })
      break
    } catch (err) {
      if (!isDatabaseConnectivityError(err)) throw err
      if (attempt === 0) {
        await sleep(600)
        continue
      }
      const e = new Error(SESSION_DB_UNAVAILABLE)
      e.cause = err
      throw e
    }
  }
  return session
}

/**
 * Loads the session; throws marked errors so callers can tell auth vs infra apart.
 * Better Auth hits Postgres — ETIMEDOUT is common when the DB is cold or the pool is busy.
 * One retry after a short delay often succeeds on Neon wake-up.
 */
export async function requireSession () {
  const session = await getSessionWithRetry()
  if (!session?.user) {
    throw new Error(SESSION_UNAUTHORIZED)
  }
  return session
}

export async function getOptionalCurrentUser () {
  const session = await getSessionWithRetry()
  if (!session?.user) return null

  const rows = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  const currentUser = rows[0]
  if (!currentUser) {
    throw new Error(SESSION_UNAUTHORIZED)
  }

  return { session, user: currentUser }
}

export async function requireCurrentUser () {
  const currentUser = await getOptionalCurrentUser()
  if (!currentUser) {
    throw new Error(SESSION_UNAUTHORIZED)
  }
  return currentUser
}

export async function requireApprovedAdmin () {
  const currentUser = await requireCurrentUser()

  if (currentUser.user.adminStatus === 'pending') {
    throw new Error(ADMIN_APPROVAL_REQUIRED)
  }

  if (currentUser.user.adminStatus !== 'approved') {
    throw new Error(ADMIN_FORBIDDEN)
  }

  return currentUser
}

export async function requireSuperUser () {
  const currentUser = await requireApprovedAdmin()

  if (currentUser.user.role !== 'super_user') {
    throw new Error(ADMIN_FORBIDDEN)
  }

  return currentUser
}
