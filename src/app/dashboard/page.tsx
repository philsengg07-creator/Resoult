
'use client';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type Ticket, type Renewal } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminDashboard } from '../tickets/admin-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { data: tickets, loading: ticketsLoading } = useDatabaseList<Ticket>('tickets');
  const { data: renewals, loading: renewalsLoading } = useDatabaseList<Renewal>('renewals');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !authLoading) {
      if (user?.role === 'Employee') {
        router.push('/tickets/new');
      }
      if (!user) {
        router.push('/role-selection');
      }
    }
  }, [user, router, isClient, authLoading]);

  const isLoading = !isClient || authLoading || ticketsLoading || renewalsLoading;
  
  if (isLoading) {
    return (
        <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="lg:col-span-4 h-80" />
                <Skeleton className="lg:col-span-3 h-80" />
            </div>
        </div>
    );
  }

  if (user?.role === 'Employee') {
    return null;
  }


  return (
    <div className="container mx-auto space-y-6">
      <AdminDashboard tickets={tickets} renewals={renewals} />
    </div>
  );
}
