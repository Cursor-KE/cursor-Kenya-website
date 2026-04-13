# Cursor Kenya

Next.js site for the Nairobi Cursor and AI-assisted coding community: a public marketing area (home, about, events, gallery, and dynamic forms) plus a password-protected admin for forms, media, and responses.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router), React 19 |
| Styling | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com)–style components (Radix) |
| Database | [PostgreSQL](https://www.postgresql.org) via [Drizzle ORM](https://orm.drizzle.team) and [`postgres`](https://github.com/porsager/postgres) ([`lib/db/postgres.ts`](lib/db/postgres.ts)) |
| Auth | [Better Auth](https://www.better-auth.com) with Drizzle adapter ([`lib/auth.ts`](lib/auth.ts), [`app/api/auth/[...all]/route.ts`](app/api/auth/[...all]/route.ts)) |
| Media | [Cloudinary](https://cloudinary.com) for signed uploads and folder listing ([`app/api/cloudinary/sign/route.ts`](app/api/cloudinary/sign/route.ts)) |
| Events | [Luma](https://lu.ma) public API when `LUMA_API_KEY` is set ([`lib/luma/client.ts`](lib/luma/client.ts)) |

## Features

- **Marketing** (`app/(marketing)/`): landing page, about, events (Luma-backed when configured), Cloudinary-backed gallery, and published forms at `/forms/[slug]`.
- **Admin** (`app/admin/`): sign-in, dashboard, form builder (draft/publish), gallery tooling, and form response review.
- **Data model** ([`db/schema.ts`](db/schema.ts)): Better Auth tables, `images` / `videos`, `forms` / `form_responses` (JSON field definitions and answers).

## Getting starte

This repo uses [pnpm](https://pnpm.io).

```bash
pnpm install
```

Create **`.env`** or **`.env.local`** in the project root (see [Environment variables](#environment-variables)). Then:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Admin UI lives under **`/admin`** (e.g. `/admin/login`).

Apply the database schema after Postgres is reachable:

```bash
pnpm db:migrate
```

Use **`pnpm db:probe`** to verify connectivity and pooler/SSL behavior without starting the app ([`scripts/db-probe.cjs`](scripts/db-probe.cjs)).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes (runtime + migrate) | Postgres connection string for the app and migrations ([`lib/db/postgres.ts`](lib/db/postgres.ts), [`scripts/migrate.cjs`](scripts/migrate.cjs)). |
| `DIRECT_URL` or `DATABASE_MIGRATE_URL` | Often (hosted DB) | **Direct/session** URL (often port `:5432`) for Drizzle CLI and `db:migrate`. Transaction poolers (e.g. port `:6543`) are rejected for migrations—see below. |
| `DATABASE_PREPARED_STATEMENTS` | If pooler errors | Set to `false` if you see prepared-statement errors with a transaction pooler. |
| `BETTER_AUTH_SECRET` | Production | Secret for Better Auth (min length enforced in production). |
| `BETTER_AUTH_URL` | Production | Public origin of the app (e.g. `https://example.com`). Defaults to `http://localhost:3000` in development. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical site URL for metadata and the auth client ([`lib/auth-client.ts`](lib/auth-client.ts)). |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | For gallery/admin uploads | Cloudinary API credentials. |
| `CLOUDINARY_UPLOAD_PREFIX` | Optional | Upload folder prefix ([`lib/cloudinary/folder.ts`](lib/cloudinary/folder.ts)). |
| `LUMA_API_KEY` | Optional | Enables event listings from Luma; without it, events UI degrades gracefully. |

**Optional tuning (Neon, SSL, connectivity):** `DATABASE_SSL_STRICT`, `DATABASE_PG_IPV4`, `DATABASE_CONNECT_TIMEOUT` / `PGCONNECT_TIMEOUT`, `DATABASE_PG_MAX`, `DATABASE_CONNECT_TIMEOUT_MS` (migrate script)—see [`drizzle.config.ts`](drizzle.config.ts), [`lib/db/postgres.ts`](lib/db/postgres.ts), and [`scripts/migrate.cjs`](scripts/migrate.cjs).

## Database migrations

- **`pnpm db:migrate`** applies SQL from `drizzle/` using [`pg`](https://www.npmjs.com/package/pg). **`drizzle.config.ts`** loads `.env` then `.env.local` and uses **`DIRECT_URL`** (or **`DATABASE_MIGRATE_URL`**) when set; otherwise **`DATABASE_URL`**. **Transaction pooler** URLs (often port `:6543`) are rejected for migrations—use a direct or session connection for CLI. Remote hosts use explicit **`ssl`** options for `node-pg`; set **`DATABASE_SSL_STRICT=1`** for strict TLS verification.
- If **`pnpm db:migrate`** errors with **already exists** / duplicate type or table, the schema may already be applied while **`drizzle.__drizzle_migrations`** is empty (e.g. schema applied earlier via **`db:push`** or raw SQL). Either insert a matching row into **`drizzle.__drizzle_migrations`** (hash = SHA-256 of the migration `.sql` file; **`created_at`** = `when` from `drizzle/meta/_journal.json` for that tag), use **`pnpm db:push`** to align without history, or start from an empty database and run **`pnpm db:migrate`** once.

Other scripts: **`pnpm db:generate`**, **`pnpm db:push`**, **`pnpm db:studio`**, **`pnpm db:migrate:kit`** (Drizzle Kit migrate).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next.js development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Run SQL migrations ([`scripts/migrate.cjs`](scripts/migrate.cjs)) |
| `pnpm db:probe` | Test DB URL / SSL / pooler behavior |
| `pnpm db:generate` | `drizzle-kit generate` |
| `pnpm db:push` / `pnpm db:studio` | Drizzle Kit push / Studio |

## Deploying

Build with **`pnpm build`**. Set the same environment variables on the host as in development. For serverless or pooled Postgres, keep **`DATABASE_PREPARED_STATEMENTS=false`** or a non-pooled URL if the driver misbehaves. See [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying) for platform-specific notes.
