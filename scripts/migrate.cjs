/**
 * Applies SQL migrations using the same Drizzle migrator as `drizzle-kit migrate`, but prints
 * full errors (drizzle-kit's spinner often exits 1 without showing the message).
 */
const path = require('node:path')
const { config } = require('dotenv')
const pg = require('pg')
const { drizzle } = require('drizzle-orm/node-postgres')
const { migrate } = require('drizzle-orm/node-postgres/migrator')

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Add it to `.env` or `.env.local`.')
  process.exit(1)
}

const migrateUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_MIGRATE_URL ??
  databaseUrl

function usesTransactionPoolerPort (urlStr) {
  try {
    const u = new URL(urlStr.replace(/^postgres(ql)?:/i, 'http:'))
    return u.port === '6543'
  } catch {
    return false
  }
}

if (usesTransactionPoolerPort(migrateUrl)) {
  console.error(
    'Drizzle migrate needs a direct/session URL (not port :6543). Set DIRECT_URL in `.env`.'
  )
  process.exit(1)
}

function isLocalPostgresUrl (urlStr) {
  try {
    const u = new URL(urlStr.replace(/^postgres(ql)?:/i, 'http:'))
    const h = u.hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
  } catch {
    return false
  }
}

const remoteSsl =
  process.env.DATABASE_SSL_STRICT === '1'
    ? true
    : { rejectUnauthorized: false }

const pool = new pg.Pool({
  connectionString: migrateUrl,
  ssl: isLocalPostgresUrl(migrateUrl) ? undefined : remoteSsl,
  max: 1,
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS) || 30_000,
  ...(isLocalPostgresUrl(migrateUrl) || process.env.DATABASE_PG_IPV4 === '0'
    ? {}
    : { family: 4 }),
})

const db = drizzle(pool)
const migrationsFolder = path.join(process.cwd(), 'drizzle')

migrate(db, { migrationsFolder })
  .then(async () => {
    console.log('[migrate] applied successfully')
    await pool.end()
  })
  .catch(async (err) => {
    console.error('[migrate] failed:', err.message || err)
    if (err.code) console.error('[migrate] code:', err.code)
    if (err.errors?.length) {
      for (const e of err.errors) {
        console.error(' —', e.message || e)
      }
    }
    console.error(err)
    await pool.end().catch(() => {})
    console.error(
      '\nTip: run `pnpm db:probe` to test the connection. ETIMEDOUT usually means firewall/VPN or Neon IP allowlist.'
    )
    process.exit(1)
  })
