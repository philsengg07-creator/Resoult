
'use client';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Ticket } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminDashboard } from '../tickets/admin-dashboard';

export default function DashboardPage() {
  const [tickets] = useLocalStorage<Ticket[]>('tickets', []);
  const { user } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && user?.role === 'Employee') {
      router.push('/tickets/new');
    }
     if (isClient && !user) {
      router.push('/role-selection');
    }
  }, [user, router, isClient]);

  if (!isClient || user?.role === 'Employee') {
    return null;
  }

  return (
    <div className="container mx-auto space-y-6">
      <AdminDashboard tickets={tickets} />
    </div>
  );
}
