
"use client"
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NotificationBell } from './notification-bell';
import { Skeleton } from './ui/skeleton';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  // Initialize push notifications hook
  usePushNotifications();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const getTitle = () => {
    if (!user) return 'Welcome';
    if (pathname === '/dashboard') return 'Admin Dashboard';
    if (pathname.startsWith('/tickets/new')) return 'Create New Ticket';
    if (pathname.startsWith('/tickets/')) return 'Ticket Details';
    if (pathname.startsWith('/tickets')) return 'All Tickets';
    if (pathname.startsWith('/renewals')) return 'Renewals';
    return user.role === 'Admin' ? 'Admin Dashboard' : 'Employee Dashboard';
  };
  
  const showHeader = !['/login', '/role-selection'].includes(pathname);

  if (!showHeader) {
    return null;
  }
  
  const isLoading = loading || !isClient;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="text-lg font-semibold md:text-xl">{!isLoading ? getTitle() : ''}</h1>
      <div className="ml-auto flex items-center gap-4">
        {isLoading ? (
            <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-32 hidden sm:block" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        ) : user ? (
          <>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Welcome, {user.name} ({user.role})
            </span>
            {user.role === 'Admin' && <NotificationBell />}
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log Out</span>
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
