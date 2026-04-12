This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This repo uses [pnpm](https://pnpm.io). Install dependencies and run the dev server:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Copy `.env.example` to `.env.local` and set **`DATABASE_URL`** to your Postgres connection string. The app uses [Drizzle](https://orm.drizzle.team) with [`postgres`](https://github.com/porsager/postgres) ([`lib/db/postgres.ts`](lib/db/postgres.ts)). Hosted providers often use a **transaction pooler** (e.g. port `:6543`); set **`DATABASE_PREPARED_STATEMENTS=false`** in `.env` if you see prepared-statement errors, or use a session/direct URL for the app. For **Drizzle CLI** (`db:migrate`, `db:push`, `db:studio`), set **`DIRECT_URL`** or **`DATABASE_MIGRATE_URL`** to a **direct or session** Postgres URL (usually port `:5432`) — see below.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Database migrations

- **`pnpm db:migrate`** applies SQL from `drizzle/` using [`pg`](https://www.npmjs.com/package/pg) (dev dependency). **`drizzle.config.ts`** loads `.env` then `.env.local` and uses **`DIRECT_URL`** (or **`DATABASE_MIGRATE_URL`**) when set; otherwise **`DATABASE_URL`**. **Transaction pooler** URLs (often port `:6543`) are rejected for migrations — use a direct or session connection for CLI. Remote hosts use explicit **`ssl`** options for `node-pg`; set **`DATABASE_SSL_STRICT=1`** for strict TLS verification.
- If **`pnpm db:migrate`** errors with **already exists** / duplicate type or table, the schema is probably already on the database while **`drizzle.__drizzle_migrations`** is empty (e.g. schema applied earlier via **`db:push`** or SQL). Either insert a matching row into **`drizzle.__drizzle_migrations`** (hash = SHA-256 of the migration `.sql` file, **`created_at`** = `when` from `drizzle/meta/_journal.json` for that tag), use **`pnpm db:push`** to align without history, or start from an empty database and run **`pnpm db:migrate`** once.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
