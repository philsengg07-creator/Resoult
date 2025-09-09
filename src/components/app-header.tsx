"use client"
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader() {
  const pathname = usePathname();
  
  const getTitle = () => {
    if (pathname.startsWith('/tickets/new')) return 'Create New Ticket';
    if (pathname.startsWith('/tickets')) return 'Ticket Dashboard';
    if (pathname.startsWith('/bills')) return 'Bill Management';
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="text-lg font-semibold md:text-xl">{getTitle()}</h1>
    </header>
  );
}
