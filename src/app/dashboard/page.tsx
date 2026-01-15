
'use client';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type Ticket, type TrackedItem } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminDashboard } from '../tickets/admin-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { sendTestNotification } from '@/ai/flows/test-notification-flow';
import { sendRenewalNotifications } from '@/ai/flows/renewal-notification-flow';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { data: tickets, loading: ticketsLoading } = useDatabaseList<Ticket>('tickets');
  const { data: renewals, loading: renewalsLoading } = useDatabaseList<TrackedItem>('renewals');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingReal, setIsSendingReal] = useState(false);
  const { toast } = useToast();

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

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const result = await sendTestNotification();
      if (result.sent) {
        toast({
          title: 'Test Email Sent!',
          description: `An email was sent to ${result.to} with ${result.count} sample items.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Send Test Email',
          description: 'The test email could not be sent. Please check the logs.',
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while sending the test email.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };
  
  const handleSendRealNotification = async () => {
    setIsSendingReal(true);
    try {
      const result = await sendRenewalNotifications();
      if (result.sent) {
        toast({
          title: 'Renewal Email Sent!',
          description: `An email was sent for ${result.count} upcoming renewal(s).`,
        });
      } else {
        toast({
          title: 'No Renewals Due',
          description: 'No items were found that are due for a renewal notification today.',
        });
      }
    } catch (error) {
      console.error('Error sending renewal notification:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while sending the renewal email.',
      });
    } finally {
      setIsSendingReal(false);
    }
  };


  const isLoading = !isClient || authLoading || ticketsLoading || renewalsLoading;

  return (
    <div className="container mx-auto space-y-6">
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
        <>
            <AdminDashboard tickets={tickets} renewals={renewals} />
            <div className="flex justify-start gap-4">
                 <Button onClick={handleSendRealNotification} disabled={isSendingReal}>
                    {isSendingReal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Renewal Notification
                </Button>
                 <Button onClick={handleSendTestNotification} disabled={isSendingTest} variant="outline">
                    {isSendingTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Test Notification
                </Button>
            </div>
        </>
      ) : null}
    </div>
  );
}
