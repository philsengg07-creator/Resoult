
'use client';
import Link from 'next/link';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type Ticket, type TicketStatus } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<TicketStatus, string> = {
  'Unopened': 'bg-blue-500 hover:bg-blue-600',
  'Open': 'bg-green-500 hover:bg-green-600',
  'In Progress': 'bg-yellow-500 hover:bg-yellow-600',
  'Closed': 'bg-red-500 hover:bg-red-600',
};

export default function TicketsPage() {
  const { data: tickets, loading: ticketsLoading } = useDatabaseList<Ticket>('tickets');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'All'>('All');

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

  const isLoading = !isClient || authLoading || ticketsLoading;

  if (isLoading) {
    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-10 w-44" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-56 w-full" />
                ))}
            </div>
        </div>
    );
  }
  
  if (user?.role === 'Employee' || !user) {
    return null;
  }

  const sortedTickets = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredTickets = sortedTickets.filter(ticket => 
    statusFilter === 'All' || ticket.status === statusFilter
  );

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Tickets</h1>
        <Select onValueChange={(value) => setStatusFilter(value as TicketStatus | 'All')} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Unopened">Unopened</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {filteredTickets.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No tickets found</CardTitle>
            <CardDescription>
              {statusFilter === 'All' 
                ? 'No tickets have been submitted by employees.' 
                : `There are no tickets with the status "${statusFilter}".`}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="pr-4">{ticket.summary || 'Ticket'}</CardTitle>
                  <Badge variant="secondary" className={`whitespace-nowrap ${statusColors[ticket.status]}`}>{ticket.status}</Badge>
                </div>
                <CardDescription>
                  Submitted by {ticket.name} • {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{ticket.problemDescription}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/tickets/${ticket.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
