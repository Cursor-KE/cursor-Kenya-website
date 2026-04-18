import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getOptionalCurrentUser } from '@/lib/auth/session'

export const metadata = {
  title: 'Admin sign in | Cursor Kenya',
}

export default async function AdminLoginPage () {
  const currentUser = await getOptionalCurrentUser()

  if (currentUser?.user.adminStatus === 'approved') {
    redirect('/admin')
  }

  if (currentUser?.user.adminStatus) {
    redirect('/admin/pending')
  }

  return <AuthForm />
}
