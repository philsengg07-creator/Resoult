
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons/logo';
import { PlusCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const showSidebar = !['/login', '/role-selection'].includes(pathname);

  if (!showSidebar) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-lg font-semibold">Resolut</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {!isClient || !user ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            </>
          ) : (
            <>
              {user?.role === 'Admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/tickets')}
                    tooltip="Dashboard"
                  >
                    <Link href="/tickets">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {user?.role === 'Employee' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/tickets/new'}
                      tooltip="New Ticket"
                    >
                      <Link href="/tickets/new">
                        <PlusCircle />
                        <span>New Ticket</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              )}
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
