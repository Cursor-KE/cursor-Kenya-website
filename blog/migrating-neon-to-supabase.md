# Migrating from Neon to Supabase (Postgres + Drizzle, in production)

> A field report from migrating a Next.js 16 / Drizzle / Better Auth app off Neon
> and onto Supabase Postgres without losing data, breaking auth sessions, or
> reshipping a single migration.

If you're reading this, you probably already know both providers are excellent.
Neon's branching is magic, Supabase's bundle (Postgres + Auth + Storage + RLS +
Realtime + a great dashboard) is hard to beat. Picking is a different post.
This one is about the boring, careful work of moving a live database between
them when the app is built on **Drizzle ORM** and you want to keep your migration
ledger intact.

The destination shape:

- App: Next.js 16 (App Router), Drizzle ORM, Better Auth, Cloudinary.
- Source: Neon (`neondb`, transaction pooler, channel binding required).
- Target: Supabase (`postgres`, transaction pooler on `:6543`).

There are five things that bite you. We'll do them in order.

---

## 1. Pick the right Supabase connection string (this is the #1 footgun)

Supabase exposes three connection strings per project. They are not
interchangeable.

| String | Port | Use it for |
|---|---|---|
| **Direct** (`db.<ref>.supabase.co:5432`) | 5432 | Migrations, one-off scripts, dumps. IPv6 only on the free tier. |
| **Session pooler** (`...pooler.supabase.com:5432`) | 5432 | Long-lived connections, IPv4-friendly. |
| **Transaction pooler** (`...pooler.supabase.com:6543`) | 6543 | Serverless / per-request workloads (Vercel, Lambda). |

For a Next.js app on Vercel you want the **transaction pooler** at `:6543`. But
the transaction pooler does not support **named prepared statements**, which is
exactly what `postgres-js` (and therefore Drizzle) defaults to. If you skip
this you'll get errors like:

```
prepared statement "drizzle_s_1" already exists
```

The fix is to disable prepared statements in your client. Concrete example:

```ts
// db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')

const usePreparedStatements =
  (process.env.DATABASE_PREPARED_STATEMENTS ?? 'true').toLowerCase() !== 'false'

const client = postgres(url, {
  prepare: usePreparedStatements,
  max: 1,
})

export const db = drizzle(client, { schema })
```

Then in `.env.local`:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
DATABASE_PREPARED_STATEMENTS=false
```

For `drizzle-kit` migrations, use the **direct** string (or session pooler) in
`drizzle.config.ts` because schema changes need a stable, statement-friendly
connection.

---

## 2. Get the data out of Neon when port 5432 is blocked

Neon's standard connection is Postgres on `:5432`. Many corporate networks,
hotel WiFi, and ISP-level firewalls silently drop outbound 5432. You'll see:

```
AggregateError [ETIMEDOUT]: connect ETIMEDOUT ...:5432
```

You have three options, in increasing order of "I just want this done":

**Option A — `pg_dump` from a machine that has port 5432 open.** Dependable and
boring. A coffee-shop laptop, a Vercel deployment with a one-off script, a
GitHub Actions runner. `--no-owner --no-acl --schema=public` will save you
pain when restoring into Supabase, where roles differ.

```bash
pg_dump \
  --no-owner --no-acl \
  --schema=public \
  --format=plain \
  "$NEON_URL" > neon-public.sql
```

**Option B — Neon's HTTP serverless driver.** Neon ships
[`@neondatabase/serverless`](https://www.npmjs.com/package/@neondatabase/serverless),
which talks Postgres over HTTPS (port 443). Use it when 5432 is blocked and
you just need to read a few tables to re-seed the new database:

```js
// scripts/inspect-neon.mjs
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.NEON_URL)

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`

for (const { table_name } of tables) {
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM ${sql(table_name)}`
  console.log(table_name, n)
}
```

**Option C — Use the Neon MCP server from your AI editor.** This is what we
actually did. The MCP exposes `list_projects`, `get_database_tables`, and
`run_sql`, which means you can dump tables straight into JSON without ever
opening a Postgres connection. If your editor already has it wired up, this is
five minutes of work versus an afternoon of network triage.

Whichever one you pick: **do not skip an in-flight backup** before any drop /
restore on the destination. `pg_dump` your Neon DB to a file and put it
somewhere safe.

---

## 3. Restore into Supabase

Create the empty Supabase project, grab the **direct** connection string, then:

```bash
psql "$SUPABASE_DIRECT_URL" < neon-public.sql
```

Three things go wrong here, all easy:

1. **Type already exists.** Drizzle's `CREATE TYPE "showcase_status" AS ENUM(...)`
   collides because the dump already created it. If you used `--no-owner --no-acl`
   you can usually re-run with `psql -v ON_ERROR_STOP=0`, or pre-edit the dump
   to wrap enums in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;`.
2. **Extensions live in `extensions` schema on Supabase.** If your Neon dump
   has `CREATE EXTENSION ... WITH SCHEMA public`, change `public` to
   `extensions` (Supabase already created the schema).
3. **`auth`, `storage`, `realtime` schemas exist.** Don't touch them. Restore
   only the `public` schema.

If you're restoring a small dataset (we had ~20 rows total across 10 tables),
forget `pg_dump` entirely and just `INSERT` the rows by hand from JSON you
pulled in step 2. It's faster and you keep total control over IDs, defaults,
and JSONB shape.

---

## 4. Reconcile the Drizzle migration ledger

This is the step everyone misses, then is mystified by for an hour.

Drizzle tracks applied migrations in `drizzle.__drizzle_migrations`. When you
run `pnpm db:migrate` against the freshly restored Supabase DB, Drizzle does
not know that the schema is already in place — that table is empty — so it
re-runs every migration from scratch. The first one that creates an existing
type or table blows up:

```
DrizzleQueryError: type "showcase_status" already exists
```

**Fix:** backfill the ledger so Drizzle thinks every migration has already
been applied. The hashes are the SHA-256 of each `.sql` file's contents, which
Drizzle has already computed locally — easiest to grab them from the local
file system or from your Neon DB before you turn it off:

```sql
-- against the OLD Neon database
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY id;
```

Then on Supabase:

```sql
INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES
  (1, '<hash-of-0000>', 1733000000000),
  (2, '<hash-of-0001>', 1733000000001),
  (3, '<hash-of-0002>', 1733000000002);
```

Now `pnpm db:migrate` is a no-op, and the next `drizzle-kit generate` will
produce a clean diff against your real schema state. Don't skip this — a
healthy ledger is what makes future migrations boring.

---

## 5. Don't break Better Auth (or whatever your auth is)

If your auth lives in the same Postgres (Better Auth, Lucia, Auth.js +
Drizzle), three pieces of state matter:

- **`user` / `account` rows** — passwords are hashed there, copy them as-is.
- **`session` rows** — these contain live cookie tokens. Copy them too if you
  want users to stay logged in across the cutover. If you don't, skip them
  and accept everyone has to sign in once.
- **`verification` rows** — pending email verifications and password resets.
  Copy or accept they'll need to re-request.

The cookie domain stays the same (you didn't change your `BETTER_AUTH_URL`),
the secret stays the same, and the schema stays the same — so as long as
`session.token` rows survive the move, sessions survive. We tested by
deploying to a preview URL pointed at the new DB and confirming an existing
admin could load `/admin` without re-authenticating.

If your project also stores an admin **status** (`pending` / `approved` /
`rejected`) on `user`, double-check those columns and any default values
came across; Drizzle's enum DDL sometimes ships defaults differently than
you'd expect.

---

## 6. Cut over without downtime

The actual cutover, in order:

1. **Freeze writes** to Neon. For most apps "put the site in maintenance for
   60 seconds" is enough; for higher-traffic apps, run logical replication or
   accept the writes you lose during the window.
2. **Re-dump** the now-frozen Neon and restore into Supabase. You're
   overwriting the test restore — `DROP SCHEMA public CASCADE; CREATE SCHEMA
   public;` first.
3. **Backfill the Drizzle ledger** again (step 4).
4. **Flip `DATABASE_URL`** in Vercel (Production) to the Supabase pooler URL
   and set `DATABASE_PREPARED_STATEMENTS=false`. Add to Preview and
   Development envs while you're there.
5. **Trigger a redeploy** so the new env vars take effect (Vercel doesn't
   hot-swap envs into running functions).
6. **Smoke test**: sign in, hit one read endpoint, hit one write endpoint,
   look at Supabase Logs Explorer for the queries.
7. **Keep Neon alive for 7 days.** You'll be amazed what you forgot — a cron
   job, a webhook handler, a script in `package.json` — that still points at
   the old URL.

---

## 7. Tidy up after the move

Worth doing within the first week, otherwise it never happens:

- **Row Level Security.** Supabase enables RLS on `public` tables by default
  in the dashboard UI flow, but on a SQL restore your tables come in with RLS
  off. If you intend to expose this DB through `supabase-js` from the browser,
  turn it on table-by-table and write policies. If you only ever talk to
  Postgres from your Next.js server, you can leave it off — but document that
  decision.
- **Connection limits.** Free-tier Supabase has hard limits. The transaction
  pooler hides this, but `pg_stat_activity` will tell you the truth. Add a
  Vercel cron (or a Supabase Edge Function) that pings `pg_stat_activity` and
  alerts on saturation.
- **Backups.** Supabase takes daily backups on the free tier and PITR on
  paid. Check the retention is what you want, and download one weekly to S3
  or Cloudflare R2 if the data matters.
- **Drop `pg_cron` jobs from Neon** that you forgot about. They'll keep
  running and emailing you errors otherwise.

---

## What I'd do differently

In hindsight, two decisions saved a lot of pain:

- **Used Drizzle from day one.** The schema is in code, the migrations are
  hashed and content-addressable, and the ledger was reconcilable with three
  `INSERT` statements. The exact same migration on a hand-managed schema
  would have meant diffing two live databases.
- **Used the MCP servers in the editor.** Neon's MCP for the read-out,
  Supabase's MCP for the write-in. No `psql`, no firewall debugging, no
  `pg_dump` flag spelunking. The whole data move was four tool calls.

What I'd do differently:

- **Set `DATABASE_PREPARED_STATEMENTS=false` before the first request.** I
  set it after the first 502 and lost five minutes diagnosing prepared
  statement collisions in Drizzle.
- **Kept a `_supabase_migration_notes.md` next to `drizzle/`** with the exact
  hashes and timestamps inserted into the ledger. Future-me would thank me.

The whole move took about an hour for a small app. Most of that hour was
realising the transaction pooler doesn't do prepared statements. Don't be me.
