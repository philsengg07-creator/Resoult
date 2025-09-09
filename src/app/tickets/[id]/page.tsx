'use client';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Ticket, type TicketStatus } from '@/types';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusColors: Record<TicketStatus, string> = {
  'Open': 'bg-green-500 hover:bg-green-600',
  'In Progress': 'bg-yellow-500 hover:bg-yellow-600',
  'Closed': 'bg-red-500 hover:bg-red-600',
};

export default function TicketDetailsPage() {
  const params = useParams();
  const { id } = params;
  const [tickets, setTickets] = useLocalStorage<Ticket[]>('tickets', []);
  const ticket = tickets.find((t) => t.id === id);

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
    setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
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
              </CardHeader>
              <CardContent>
                <p>{ticket.additionalInfo}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Suggested Solutions (AI)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.suggestedSolutions || 'No solutions suggested.'}</p>
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Image Analysis (AI)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{ticket.imageAnalysis || 'No image provided for analysis.'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
