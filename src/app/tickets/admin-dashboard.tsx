
'use client';
import { useMemo } from 'react';
import { type Ticket } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';

interface AdminDashboardProps {
  tickets: Ticket[];
}

const chartConfig = {
  tickets: {
    label: 'Tickets',
  },
  Unopened: {
    label: 'Unopened',
    color: 'hsl(var(--chart-5))',
  },
  Open: {
    label: 'Open',
    color: 'hsl(var(--chart-1))',
  },
  'In Progress': {
    label: 'In Progress',
    color: 'hsl(var(--chart-2))',
  },
  Closed: {
    label: 'Closed',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function AdminDashboard({ tickets }: AdminDashboardProps) {
  const ticketCounts = useMemo(() => {
    const counts = {
      Unopened: 0,
      Open: 0,
      'In Progress': 0,
      Closed: 0,
    };
    tickets.forEach(ticket => {
      if (counts.hasOwnProperty(ticket.status)) {
        counts[ticket.status]++;
      }
    });
    return counts;
  }, [tickets]);

  const totalTickets = tickets.length;
  const activeTickets = ticketCounts.Unopened + ticketCounts.Open + ticketCounts['In Progress'];

  const chartData = [
    { status: 'Unopened', tickets: ticketCounts.Unopened, fill: 'var(--color-Unopened)' },
    { status: 'Open', tickets: ticketCounts.Open, fill: 'var(--color-Open)' },
    { status: 'In Progress', tickets: ticketCounts['In Progress'], fill: 'var(--color-In Progress)' },
    { status: 'Closed', tickets: ticketCounts.Closed, fill: 'var(--color-Closed)' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTickets}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeTickets}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Closed Tickets</CardTitle>
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ticketCounts.Closed}</div>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Ticket Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart accessibilityLayer data={chartData}>
               <CartesianGrid vertical={false} />
              <XAxis dataKey="status" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="tickets" radius={4}>
                <LabelList position="top" offset={4} className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
