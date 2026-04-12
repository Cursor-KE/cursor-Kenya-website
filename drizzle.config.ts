import path from 'node:path'
import { URL } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

const envFile = (name: string) => path.resolve(process.cwd(), name)

/** Parse a postgres URL for `node-pg` when we cannot use `url` alone (see dbCredentials below). */
function postgresUriToCredentials (connectionString: string) {
  const normalized = connectionString
    .replace(/^postgresql:\/\//i, 'http://')
    .replace(/^postgres:\/\//i, 'http://')
  const u = new URL(normalized)
  const database = u.pathname.replace(/^\//, '') || 'postgres'
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  }
}

function isLocalPostgresUrl (urlStr: string): boolean {
  try {
    const u = new URL(urlStr.replace(/^postgres(ql)?:/i, 'http:'))
    const h = u.hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
  } catch {
    return false
  }
}

function usesTransactionPoolerPort (urlStr: string): boolean {
  try {
    const u = new URL(urlStr.replace(/^postgres(ql)?:/i, 'http:'))
    return u.port === '6543'
  } catch {
    return false
  }
}

// Load like Next.js: .env then .env.local overrides (cwd-relative so CLI always finds files)
config({ path: envFile('.env') })
config({ path: envFile('.env.local'), override: true })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Add it to `.env` or `.env.local` (see `.env.example`).'
  )
}

/**
 * Drizzle Kit (`migrate`, `push`, `studio`) uses `node-pg`. Many **transaction** poolers
 * (port **6543**, PgBouncer transaction mode, etc.) do not support the session features
 * migrations need. Use **DIRECT_URL** / **DATABASE_MIGRATE_URL** pointing at a **session**
 * or **direct** Postgres port (often **:5432**) for CLI tools.
 */
const migrateUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_MIGRATE_URL ??
  databaseUrl

if (usesTransactionPoolerPort(migrateUrl)) {
  throw new Error(
    'Drizzle Kit (migrate/push/studio) is configured with a URL that uses port :6543, ' +
      'which is often a transaction pooler and breaks migrations (DDL, prepared statements). ' +
      'Set DIRECT_URL (or DATABASE_MIGRATE_URL) to a direct or session Postgres connection ' +
      '(typically port :5432), then run pnpm db:migrate again.'
  )
}

/**
 * drizzle-kit uses `node-pg`. With `ssl: true`, Node verifies the server cert chain; some
 * environments hit `SELF_SIGNED_CERT_IN_CHAIN`. Default: encrypt without verifying the chain
 * so `pnpm db:migrate` works; set `DATABASE_SSL_STRICT=1` for strict verification.
 */
const remoteSsl =
  process.env.DATABASE_SSL_STRICT === '1'
    ? true
    : { rejectUnauthorized: false }

/**
 * If `url` is set alone, drizzle-kit may not forward `ssl` to `pg` in some paths.
 * For remote hosts, pass explicit credentials + ssl (see drizzle-kit / pg issues).
 * @see https://github.com/drizzle-team/drizzle-orm/issues/831
 */
const useCredentialMode = !isLocalPostgresUrl(migrateUrl)

/**
 * Neon (and some networks) resolve the DB hostname to IPv6 first; if IPv6 is unroutable,
 * `node-pg` can fail with ETIMEDOUT / ENETUNREACH. Prefer IPv4 for remote hosts.
 * @see https://orm.drizzle.team/docs/tutorials/drizzle-with-db/drizzle-with-neon
 */
const preferIpv4 =
  useCredentialMode && process.env.DATABASE_PG_IPV4 !== '0'

const dbCredentials = useCredentialMode
  ? {
      ...postgresUriToCredentials(migrateUrl),
      ssl: remoteSsl,
      ...(preferIpv4 ? { family: 4 as const } : {}),
    }
  : { url: migrateUrl }

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials,
})
