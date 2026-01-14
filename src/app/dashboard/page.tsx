
'use client';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type Ticket, type TrackedItem } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminDashboard } from '../tickets/admin-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BellRing } from 'lucide-react';
import { sendRenewalNotifications } from '@/ai/flows/renewal-notification-flow';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { data: tickets, loading: ticketsLoading } = useDatabaseList<Ticket>('tickets');
  const { data: renewals, loading: renewalsLoading } = useDatabaseList<TrackedItem>('renewals');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isCheckingNotifications, setIsCheckingNotifications] = useState(false);

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

  const handleCheckNotifications = async () => {
    setIsCheckingNotifications(true);
    try {
      const result = await sendRenewalNotifications();
      if (result.sent) {
        toast({
          title: 'Notifications Sent',
          description: `An email was sent for ${result.count} expiring item(s).`,
        });
      } else {
        toast({
          title: 'No Notifications to Send',
          description: 'There are no items expiring in 10 or 30 days.',
        });
      }
    } catch (error) {
      console.error('Failed to send notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not check for renewal notifications.',
      });
    } finally {
      setIsCheckingNotifications(false);
    }
  };

  const isLoading = !isClient || authLoading || ticketsLoading || renewalsLoading;

  return (
    <div className="container mx-auto space-y-6">
       <div className="flex justify-end">
          <Button onClick={handleCheckNotifications} disabled={isCheckingNotifications}>
              {isCheckingNotifications ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="mr-2 h-4 w-4" />
              )}
              Check for Notifications
            </Button>
        </div>

      {isLoading ? (
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
      ) : user?.role === 'Admin' ? (
        <AdminDashboard tickets={tickets} renewals={renewals} />
      ) : null}
    </div>
  );
}
