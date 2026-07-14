import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

/**
 * Drizzle + postgres-js. Production runtime uses `DATABASE_URL`; development
 * and production builds prefer `DIRECT_URL` when available because they are
 * long-lived, query-heavy processes.
 * @see https://orm.drizzle.team/docs/get-started-postgresql#postgresjs
 *
 * Transaction poolers (PgBouncer, many serverless poolers) do not support prepared
 * statements — set `DATABASE_PREPARED_STATEMENTS=false` or use a URL with port
 * `6543` / hostname containing `pooler` to disable prepare automatically.
 */
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
}

const shouldUseDirectUrl = process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PHASE === 'phase-production-build'
const connectionString = shouldUseDirectUrl && process.env.DIRECT_URL
  ? process.env.DIRECT_URL
  : databaseUrl

function parsePgUrl (dsn: string): URL | null {
  try {
    const normalized = dsn.replace(/^postgres(ql)?:/i, 'http:')
    return new URL(normalized)
  } catch {
    return null
  }
}

function isLocalHost (hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  )
}

const parsed = parsePgUrl(connectionString)
const host = parsed?.hostname ?? ''
const port = parsed?.port ?? ''

const explicitPrepareOff = process.env.DATABASE_PREPARED_STATEMENTS === 'false'
/** PgBouncer / Neon pooler hostnames: no prepared statements. */
const looksLikeTxnPooler = port === '6543' || host.includes('pooler')

const usePrepare = !(explicitPrepareOff || looksLikeTxnPooler)

const useSsl = parsed ? !isLocalHost(host) : true

function parseTimeoutSeconds (raw: string | undefined, fallback: number) {
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parsePositiveInt (raw: string | undefined, fallback: number) {
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Remote DBs (Neon, etc.) cold-start or slow DNS; default 120s vs postgres.js default 30s. */
const connectTimeoutSeconds = parseTimeoutSeconds(
  process.env.DATABASE_CONNECT_TIMEOUT ?? process.env.PGCONNECT_TIMEOUT,
  parsed && isLocalHost(host) ? 30 : 120
)

/** Cap parallel connections (Neon free tier); override with DATABASE_PG_MAX. */
const maxConnections = parsePositiveInt(
  process.env.DATABASE_PG_MAX,
  looksLikeTxnPooler ? 2 : isLocalHost(host) ? 10 : 5
)

type PostgresClient = ReturnType<typeof postgres>

const globalForPostgres = globalThis as typeof globalThis & {
  cursorKenyaPostgresClient?: PostgresClient
}

/**
 * Next dev compiles route entries independently. Without a global singleton,
 * every admin page can create its own postgres.js pool and exhaust a remote
 * transaction pooler while navigating between routes.
 */
const client = globalForPostgres.cursorKenyaPostgresClient ?? postgres(connectionString, {
  max: maxConnections,
  connect_timeout: connectTimeoutSeconds,
  idle_timeout: 20,
  ...(useSsl ? { ssl: 'require' as const } : {}),
  ...(!usePrepare ? { prepare: false } : {}),
})

globalForPostgres.cursorKenyaPostgresClient = client

export const db = drizzle(client, { schema })
