'use client';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Ticket, type TicketStatus } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminDashboard } from './admin-dashboard';

const statusColors: Record<TicketStatus, string> = {
  'Open': 'bg-green-500 hover:bg-green-600',
  'In Progress': 'bg-yellow-500 hover:bg-yellow-600',
  'Closed': 'bg-red-500 hover:bg-red-600',
};

export default function TicketsPage() {
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
  }, [user, router, isClient]);

  if (!isClient || user?.role === 'Employee') {
    return null;
  }

  const sortedTickets = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="container mx-auto space-y-6">
      <AdminDashboard tickets={tickets} />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">All Tickets</h2>
      </div>

      {sortedTickets.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No tickets yet</CardTitle>
            <CardDescription>No tickets have been submitted by employees.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTickets.map((ticket) => (
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
