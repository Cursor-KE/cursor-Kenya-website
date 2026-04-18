import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import { account, session, user, verification } from '@/db/schema'
import { SUPER_USER_EMAIL } from '@/lib/auth/admin'

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
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'admin',
        input: false,
      },
      adminStatus: {
        type: 'string',
        required: false,
        defaultValue: 'pending',
        input: false,
      },
      approvedByUserId: {
        type: 'string',
        required: false,
        input: false,
      },
      approvedAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (nextUser) => {
          const isSuperUser = nextUser.email.toLowerCase() === SUPER_USER_EMAIL
          return {
            data: {
              ...nextUser,
              role: isSuperUser ? 'super_user' : 'admin',
              adminStatus: isSuperUser ? 'approved' : 'pending',
              approvedAt: isSuperUser ? new Date() : null,
              approvedByUserId: null,
            },
          }
        },
      },
    },
  },
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : ['http://localhost:3000'],
})
