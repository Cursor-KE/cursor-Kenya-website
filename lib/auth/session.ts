import 'server-only'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export const SESSION_DB_UNAVAILABLE = 'SESSION_DB_UNAVAILABLE'
export const SESSION_UNAUTHORIZED = 'SESSION_UNAUTHORIZED'

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

/**
 * Loads the session; throws marked errors so callers can tell auth vs infra apart.
 * Better Auth hits Postgres — ETIMEDOUT is common when the DB is cold or the pool is busy.
 * One retry after a short delay often succeeds on Neon wake-up.
 */
export async function requireSession () {
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
  if (!session?.user) {
    throw new Error(SESSION_UNAUTHORIZED)
  }
  return session
}
