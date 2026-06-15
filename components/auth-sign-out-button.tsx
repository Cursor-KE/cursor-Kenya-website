'use client'

import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function AuthSignOutButton ({
  className,
  variant = 'ghost',
}: {
  className?: string
  variant?: 'ghost' | 'outline'
}) {
  return (
    <Button
      variant={variant}
      className={className}
      onClick={async () => {
        await authClient.signOut()
        window.location.href = '/admin/login'
      }}
    >
      <LogOut data-icon="inline-start" />
      Sign out
    </Button>
  )
}
