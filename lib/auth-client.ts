import { createAuthClient } from 'better-auth/react'

/** Same-origin `/api/auth` — set `NEXT_PUBLIC_APP_URL` if the client is served from another origin */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})
