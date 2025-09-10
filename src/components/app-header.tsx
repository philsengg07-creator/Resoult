
"use client"
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const getTitle = () => {
    if (!user) return 'Welcome';
    if (pathname.startsWith('/tickets/new')) return 'Create New Ticket';
    if (pathname.startsWith('/tickets/')) return 'Ticket Details';
    if (pathname.startsWith('/tickets')) return 'Ticket Dashboard';
    if (pathname.startsWith('/bills')) return 'Bill Management';
    return user.role === 'Admin' ? 'Admin Dashboard' : 'Employee Dashboard';
  };
  
  const showHeader = !['/login', '/role-selection'].includes(pathname);

  if (!showHeader) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="text-lg font-semibold md:text-xl">{isClient ? getTitle() : ''}</h1>
      <div className="ml-auto flex items-center gap-4">
        {isClient && user && (
          <>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Welcome, {user.name} ({user.role})
            </span>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log Out</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
