const DEV_BETTER_AUTH_SECRET = 'dev-better-auth-secret-min-32-chars-long!'
const DEV_CREDIT_VERIFICATION_SECRET = 'development-only-credit-secret'

function readRequiredSecret (name: string, developmentFallback: string): string {
  const configured = process.env[name]?.trim()
  if (configured) return configured

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production.`)
  }

  return developmentFallback
}

export function getBetterAuthSecret (): string {
  return readRequiredSecret('BETTER_AUTH_SECRET', DEV_BETTER_AUTH_SECRET)
}

export function getCreditVerificationSecret (): string {
  return readRequiredSecret('BETTER_AUTH_SECRET', DEV_CREDIT_VERIFICATION_SECRET)
}
