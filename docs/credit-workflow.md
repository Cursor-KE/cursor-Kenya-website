# Credit workflow

Cursor Kenya distributes credits through provider-neutral campaigns. Cursor is seeded as the default provider by migration `0009_credit_workflow.sql`; approved admins can add providers such as Codex, DFAL, ElevenLabs, or future providers without code changes.

## Roles and access

All credit administration requires a signed-in, approved admin. Only a `super_user` can create a campaign. This rule is enforced inside the server action with `requireSuperUser()`, independently of the UI. Approved admins can manage existing campaign lifecycle settings, allocations, guests, and inventory. Provider archival and inventory revocation are also super-user-only because they are destructive. Revocation requires a reason and is audited.

The workspace is available at `/admin/credits`. Public claims use `/credits/<campaign-slug>`.

## Providers, campaigns, and allocations

A provider is a reusable credit source. Archive providers instead of deleting them so historical claims stay intact. A campaign is a distribution programme and is deliberately separate from Luma events. Campaign statuses are `draft`, `active`, `paused`, `ended`, and `archived`.

Each campaign contains one or more campaign-provider allocations. The first allocation defaults to Cursor in the admin UI. An allocation can be paused independently and may show provider-specific public instructions. Inventory assigned to an allocation must belong to the same provider; the server validates this before insert.

Campaigns may optionally reference one synchronized `luma_events` row. The system never duplicates Luma event records and never calls an undocumented check-in endpoint.

## Guests and Luma

Guests are unique by campaign and normalized email. Emails are trimmed, lowercased, validated, and stored as the matching key. Eligibility is either `eligible` or `removed`; claim state is derived from `credit_claims` and is not another mutable guest flag. Removing a guest preserves historical claims.

Admins can add guests manually, paste a guest CSV, or import synchronized Luma guests. A Luma import reads only `luma_guests` whose `event_id` matches the campaign's mapped Luma event. Claiming does not update `luma_guests.checked_in_at`. Reporting treats credit claimed, confirmed redemption, and Luma checked in as separate facts.

## Inventory and secrets

Inventory can be unallocated or assigned to a compatible campaign-provider allocation. Values are globally deduplicated using a SHA-256 fingerprint. Admin lists contain only a masked value. Full values are revealed only after a verified successful claim or verified retry.

Set `CREDIT_ENCRYPTION_KEY` in every runtime that reads or writes inventory. With this setting, values are encrypted at rest using AES-256-GCM. Existing values must continue to use the same key. If the variable is absent in production, inventory writes fail closed instead of storing reversible values. Local development can still use an explicitly marked base64 fallback; this is not encryption.

Claimed inventory cannot be edited or deleted. Super users can revoke it through an audited action. Revocation preserves the original claim and does not allocate a replacement.

## CSV formats

Imports accept UTF-8 CSV up to 1 MB and 5,000 data rows. Headers and rows are validated before insertion. Invalid and duplicate rows are skipped while valid rows are committed, and the result reports created, skipped, invalid, and duplicate counts. Import records never contain full credit values.

Guest CSV:

```csv
email,name,external_id
ada@example.com,Ada Lovelace,luma-guest-123
```

`email` is required. `name` and `external_id` are optional. See `docs/templates/credit-guests.csv`.

Inventory CSV:

```csv
credit,label,expires_at
https://provider.example/redeem/secret,July batch,2026-08-01T00:00:00Z
```

`credit` is required. `label` and `expires_at` are optional. Provider and allocation are selected in the admin UI and are never trusted from CSV. See `docs/templates/credit-inventory.csv`.

## Verification and allocation

The public form always returns a generic response before verification to avoid revealing RSVP membership. Eligible guests receive a six-digit code that expires after 10 minutes. Requests are limited to three per normalized email and ten per IP hash in a 15-minute window. Codes allow five attempts. Configure SMTP with the existing variables documented in the README. For local-only testing, `CREDIT_DEV_VERIFICATION_CODE` supplies a known code when `NODE_ENV` is not `production`.

After verification, the server checks campaign status and claim window, allocation and provider status, guest eligibility, existing claim, and inventory availability. Allocation runs in a PostgreSQL transaction using `FOR UPDATE SKIP LOCKED`. Unique constraints prevent two inventory items for one guest/allocation and prevent one item from belonging to two claims. A retry returns the existing value rather than allocating a replacement. Exhaustion produces a clean out-of-stock result without a partial claim.

`claimed_at` means the application assigned and revealed a credit. `redeemed_at` remains null until a trusted provider integration or explicit audited admin operation confirms redemption. Luma attendance is never inferred from either value.

## Operations

Run:

```bash
sudo pg_ctlcluster 16 main start
pnpm db:migrate
pnpm db:probe
pnpm dev
```

The admin dashboard reports total, available, claimed, and revoked inventory, eligible guests, claims, and confirmed redemptions. Campaign allocation cards show their claim counts. Full credit values are excluded from list queries, analytics, errors, and audit metadata.
