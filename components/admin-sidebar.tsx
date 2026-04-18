'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ImageIcon,
  LayoutDashboard,
  FileText,
  ListChecks,
  Sparkles,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthSignOutButton } from '@/components/auth-sign-out-button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

function AdminNavLink ({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (isMobile) setOpenMobile(false)
      }}
    >
      {children}
    </Link>
  )
}

export function AdminChrome ({
  children,
  currentUserRole,
  pendingAdminCount,
}: {
  children: React.ReactNode
  currentUserRole: 'super_user' | 'admin'
  pendingAdminCount: number
}) {
  const pathname = usePathname()
  const items = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
    { href: '/admin/community-showcase', label: 'Showcase', icon: Sparkles },
    { href: '/admin/forms', label: 'Forms', icon: FileText },
    { href: '/admin/responses', label: 'Responses', icon: ListChecks },
    ...(currentUserRole === 'super_user'
      ? [{ href: '/admin/users', label: 'Admin Users', icon: Users }]
      : []),
  ]

  return (
    <SidebarProvider>
      <Sidebar className="border-border bg-sidebar">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <Link href="/" className="text-sm font-semibold text-sidebar-foreground">
            Cursor Kenya
          </Link>
          <p className="text-xs text-muted-foreground">Admin</p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigate</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={
                        item.href === '/admin'
                          ? pathname === '/admin'
                          : pathname.startsWith(item.href)
                      }
                      render={
                        <AdminNavLink
                          href={item.href}
                          className="flex items-center gap-2"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                          {item.href === '/admin/users' && pendingAdminCount > 0 ? (
                            <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {pendingAdminCount}
                            </span>
                          ) : null}
                        </AdminNavLink>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <AuthSignOutButton className="w-full justify-start text-muted-foreground" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <div className={cn('flex min-h-svh min-w-0 flex-col border-border bg-background')}>
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <SidebarTrigger className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Admin workspace</p>
              <p className="truncate text-xs text-muted-foreground">Cursor Kenya</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
