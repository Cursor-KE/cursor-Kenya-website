import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Admin sign in | Cursor Kenya',
}

export default async function AdminLoginPage () {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/admin')

  return <AuthForm />
}
