# AGENTS.md

## Cursor Cloud specific instructions

This is the **Cursor Kenya** Next.js 16 (App Router) app backed by local PostgreSQL. Standard
commands live in [`README.md`](README.md) and `package.json` `scripts` (`pnpm dev`, `pnpm lint`,
`pnpm test`, `pnpm db:migrate`, etc.) — use those; the notes below only cover non-obvious caveats
discovered while setting up this environment.

### Database (PostgreSQL) — must be started manually
- A local PostgreSQL 16 cluster provides the DB. It is **not** auto-started on VM boot. Start it
  before running the app, migrations, or anything that touches Better Auth:
  `sudo pg_ctlcluster 16 main start`
- Connection details (already in the gitignored `.env`): database `cursork`, role `cursork`,
  password `cursork`, on `127.0.0.1:5432`.
- `.env` is gitignored, so it is environment-local, not in the repo. If it is missing, recreate it
  with at least `DATABASE_URL`, `DIRECT_URL` (same local URL is fine), `BETTER_AUTH_SECRET`, and
  `BETTER_AUTH_URL` pointing at the local dev origin (port 3000). See [`README.md`](README.md)
  "Environment variables".
- Apply schema with `pnpm db:migrate` (idempotent; safe to re-run). Quick connectivity check:
  `pnpm db:probe`.

### Tests require Node >= 22.15 (default shim is 22.14 and fails)
- The default `node` on PATH (`/exec-daemon/node`) is v22.14.0. `pnpm test` loads
  `tests/register-aliases.mjs`, which imports `registerHooks` from `node:module` — only available
  in Node >= 22.15. With the default shim, every test errors with
  `does not provide an export named 'registerHooks'`.
- nvm has a compatible Node (v22.22.2) installed and set as the nvm default. Run tests with it:
  `export NVM_DIR=/home/ubuntu/.nvm; . "$NVM_DIR/nvm.sh"; PATH="$(dirname "$(nvm which 22.22.2)"):$PATH" pnpm test`
- `pnpm dev`, `pnpm lint`, and `pnpm db:migrate` work fine on the default Node 22.14 shim — only the
  test harness needs the newer Node.

### Admin / auth quick path
- Admin UI is under `/admin` (sign in at `/admin/login`). New admin signups default to
  `pending` and need super-user approval. The hardcoded super-user email
  `felixkent360@gmail.com` (`lib/auth/admin.ts`) is auto-approved on signup, giving immediate
  admin access — use it for local admin testing.

### Optional integrations degrade gracefully
- Cloudinary (gallery/uploads), OpenAI (AI form/showcase review), SMTP (showcase emails), and Luma
  (events) are all optional. Features depending on them are disabled when their env vars are unset;
  the core app, admin, forms, and auth run without any of them.
