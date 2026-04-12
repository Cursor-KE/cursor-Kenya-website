'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ImageIcon,
  LayoutDashboard,
  LogOut,
  FileText,
  ListChecks,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/sidebar'

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
  { href: '/admin/forms', label: 'Forms', icon: FileText },
  { href: '/admin/responses', label: 'Responses', icon: ListChecks },
]

export function AdminChrome ({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
                        <Link href={item.href} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              await authClient.signOut()
              window.location.href = '/admin/login'
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <div className={cn('min-h-svh border-border bg-background')}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
