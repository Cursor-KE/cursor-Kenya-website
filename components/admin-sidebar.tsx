'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  ImageIcon,
  IdCard,
  LayoutDashboard,
  FileText,
  ListChecks,
  Quote,
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
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'

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
    { href: '/admin/frame', label: 'Frame Card', icon: IdCard },
    { href: '/admin/community-showcase', label: 'Showcase', icon: Sparkles },
    { href: '/admin/forms', label: 'Forms', icon: FileText },
    { href: '/admin/responses', label: 'Responses', icon: ListChecks },
    { href: '/admin/testimonials', label: 'Testimonials', icon: Quote },
    ...(currentUserRole === 'super_user'
      ? [{ href: '/admin/users', label: 'Admin Users', icon: Users }]
      : []),
  ]

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="floating" className="border-sidebar-border/70 bg-transparent">
        <SidebarHeader className="gap-3 border-b border-sidebar-border/70 px-3 py-3">
          <Link
            href="/admin"
            className="group flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_28px_var(--glow)]">
              CK
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                Cursor Kenya
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Admin console
              </span>
            </span>
          </Link>
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="rounded-lg border border-sidebar-border/80 bg-sidebar-accent/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Live workspace
                </p>
                <span className="size-2 rounded-full bg-primary shadow-[0_0_18px_var(--glow-strong)]" />
              </div>
              <p className="mt-2 text-sm font-medium text-sidebar-foreground">
                Content operations
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-1 py-2">
          <SidebarGroup className="gap-1">
            <SidebarGroupLabel className="px-3 uppercase tracking-[0.16em]">Navigate</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {items.map((item) => {
                  const isActive = item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href)

                  return (
                    <SidebarMenuItem key={item.href} className="group/item">
                      <SidebarMenuButton
                        tooltip={item.label}
                        isActive={isActive}
                        className={cn(
                          'relative h-10 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground',
                          isActive && 'shadow-[inset_0_0_0_1px_var(--sidebar-border)] before:absolute before:left-0 before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary before:shadow-[0_0_16px_var(--glow-strong)]'
                        )}
                        render={
                          <AdminNavLink
                            href={item.href}
                            className="flex items-center gap-2"
                          >
                            <item.icon />
                            <span>{item.label}</span>
                            {item.href === '/admin/users' && pendingAdminCount > 0 ? (
                              <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary group-data-[collapsible=icon]:hidden">
                                {pendingAdminCount}
                              </span>
                            ) : null}
                          </AdminNavLink>
                        }
                      />
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border/70 p-3">
          <div className="group-data-[collapsible=icon]:hidden">
            <Link
              href="/"
              className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span>View public site</span>
              <ArrowUpRight />
            </Link>
          </div>
          <AuthSignOutButton className="w-full justify-start text-muted-foreground" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <div className={cn('relative flex min-h-svh min-w-0 flex-col overflow-hidden border-border bg-background')}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--glow),transparent_62%)] opacity-80" />
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
            <SidebarTrigger className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Admin workspace</p>
              <p className="truncate text-xs text-muted-foreground">Cursor Kenya</p>
            </div>
            {pendingAdminCount > 0 ? (
              <Badge variant="secondary" className="ml-auto">
                {pendingAdminCount} pending
              </Badge>
            ) : null}
          </div>
          <div className="relative z-10 min-w-0 flex-1">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
