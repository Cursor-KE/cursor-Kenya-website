import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthSignOutButton } from '@/components/auth-sign-out-button'
import { buttonVariants } from '@/components/ui/button'
import { getOptionalCurrentUser } from '@/lib/auth/session'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Admin approval pending | Cursor Kenya',
}

export default async function AdminPendingPage () {
  const currentUser = await getOptionalCurrentUser()

  if (!currentUser) {
    redirect('/admin/login')
  }

  if (currentUser.user.adminStatus === 'approved') {
    redirect('/admin')
  }

  const isRejected = currentUser.user.adminStatus === 'rejected'

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card/70 p-8 shadow-sm backdrop-blur-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {isRejected ? 'Admin access not approved' : 'Admin approval pending'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isRejected
            ? 'Your admin signup was reviewed and not approved. Only the super user can reopen access for this account.'
            : 'Your account has been created, but dashboard access stays locked until the super user approves your admin request.'}
        </p>
        <p className="mt-3 text-sm text-foreground/80">
          Signed in as <span className="font-medium">{currentUser.user.email}</span>
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'justify-center')}>
            Back to site
          </Link>
          <AuthSignOutButton className="justify-center" variant="outline" />
        </div>
      </div>
    </div>
  )
}
