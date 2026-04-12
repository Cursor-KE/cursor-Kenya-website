import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminChrome } from '@/components/admin-sidebar'

export default async function AdminDashboardLayout ({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/admin/login')

  return <AdminChrome>{children}</AdminChrome>
}
