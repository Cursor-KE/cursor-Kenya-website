import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

/**
 * Drizzle + postgres-js. Use `DATABASE_URL` (Postgres connection string).
 * @see https://orm.drizzle.team/docs/get-started-postgresql#postgresjs
 *
 * Transaction poolers (PgBouncer, many serverless poolers) do not support prepared
 * statements — set `DATABASE_PREPARED_STATEMENTS=false` or use a URL with port
 * `6543` / hostname containing `pooler` to disable prepare automatically.
 */
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

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
  isLocalHost(host) ? 10 : 5
)

const client = postgres(connectionString, {
  max: maxConnections,
  connect_timeout: connectTimeoutSeconds,
  idle_timeout: 20,
  ...(useSsl ? { ssl: 'require' as const } : {}),
  ...(!usePrepare ? { prepare: false } : {}),
})

export const db = drizzle(client, { schema })
