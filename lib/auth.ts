import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import { account, session, user, verification } from '@/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === 'production' ? '' : 'dev-better-auth-secret-min-32-chars-long!'),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  emailAndPassword: { enabled: true },
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : ['http://localhost:3000'],
})
