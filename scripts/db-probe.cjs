/**
 * drizzle-kit migrate often exits 1 without printing the error (spinner UI swallows it).
 * Run: pnpm db:probe — uses the same migrate URL precedence as drizzle.config.ts
 */
const path = require('node:path')
const { config } = require('dotenv')
const { Client } = require('pg')

config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

const databaseUrl = process.env.DATABASE_URL
const migrateUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_MIGRATE_URL ??
  databaseUrl

if (!migrateUrl) {
  console.error(
    'Missing DATABASE_URL (and no DIRECT_URL / DATABASE_MIGRATE_URL). Check .env and .env.local.'
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

const client = new Client({
  connectionString: migrateUrl,
  ssl: isLocalPostgresUrl(migrateUrl) ? undefined : remoteSsl,
  ...(isLocalPostgresUrl(migrateUrl) || process.env.DATABASE_PG_IPV4 === '0'
    ? {}
    : { family: 4 }),
})

client
  .connect()
  .then(() => client.query('select 1 as ok'))
  .then((res) => {
    console.log('db-probe: OK', res.rows)
    return client.end()
  })
  .catch((err) => {
    console.error('db-probe: connection failed (this is the error migrate hides):')
    const first = err.errors?.[0]
    console.error(first?.message || err.message || String(err))
    if (err.code) console.error('code:', err.code)
    if (err.errors?.length) {
      for (const e of err.errors) {
        console.error(' —', e.message || e)
      }
    }
    process.exit(1)
  })
