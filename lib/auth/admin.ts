export const SUPER_USER_EMAIL = 'felixkent360@gmail.com'
export const SUPER_USER_AUTO_APPROVAL_ENV = 'ALLOW_SUPER_USER_EMAIL_AUTO_APPROVAL'

export type AdminRole = 'super_user' | 'admin'
export type AdminStatus = 'pending' | 'approved' | 'rejected'

function isTruthyEnv (value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true'
}

export function isSuperUserEmail (email: string): boolean {
  return email.trim().toLowerCase() === SUPER_USER_EMAIL
}

export function shouldAutoApproveSuperUserSignup (email: string): boolean {
  if (!isSuperUserEmail(email)) return false

  if (process.env.NODE_ENV !== 'production') return true

  return isTruthyEnv(process.env[SUPER_USER_AUTO_APPROVAL_ENV])
}
