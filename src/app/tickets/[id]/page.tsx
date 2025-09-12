
'use client';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type Ticket, type TicketStatus } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<TicketStatus, string> = {
  'Unopened': 'bg-blue-500 hover:bg-blue-600',
  'Open': 'bg-green-500 hover:bg-green-600',
  'In Progress': 'bg-yellow-500 hover:bg-yellow-600',
  'Closed': 'bg-red-500 hover:bg-red-600',
};

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { id } = params;
  const { data: tickets, update: updateTicket, loading: ticketsLoading } = useDatabaseList<Ticket>('tickets');
  
  const ticket = useMemo(() => tickets.find((t) => t.id === id), [tickets, id]);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (isClient && user?.role === 'Admin' && ticket?.status === 'Unopened') {
        updateTicket(ticket.id, { ...ticket, status: 'Open' });
    }
  }, [isClient, user, ticket, updateTicket]);


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
  
  const isLoading = !isClient || authLoading || ticketsLoading;

  if (isLoading) {
    return (
        <div className="container mx-auto max-w-4xl space-y-6">
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
            </Card>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
  }
  
  if (user?.role === 'Employee' || !user) {
    return null;
  }

  if (!ticket) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket not found</CardTitle>
          <CardDescription>The ticket you are looking for does not exist.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (newStatus === 'Unopened') return;
    updateTicket(ticket.id, { ...ticket, status: newStatus });
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl">{ticket.summary}</CardTitle>
              <CardDescription>
                Submitted by {ticket.name} on {format(new Date(ticket.createdAt), 'PPP')}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className={`whitespace-nowrap ${statusColors[ticket.status]}`}>{ticket.status}</Badge>
              <Select onValueChange={handleStatusChange} value={ticket.status}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Problem Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{ticket.problemDescription}</p>
            </CardContent>
          </Card>

          {ticket.additionalInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </Header>
              <CardContent>
                <p>{ticket.additionalInfo}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          {ticket.photo && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Photo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-square rounded-md overflow-hidden border">
                  <Image src={ticket.photo} alt="User submitted photo" layout="fill" objectFit="contain" data-ai-hint="issue screenshot" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
