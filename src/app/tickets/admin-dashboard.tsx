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
      Open: 0,
      'In Progress': 0,
      Closed: 0,
    };
    tickets.forEach(ticket => {
      counts[ticket.status]++;
    });
    return counts;
  }, [tickets]);

  const totalTickets = tickets.length;

  const chartData = [
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
          <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ticketCounts.Open}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets by Status</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3a2 2 0 0 0-1.7-.9H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16Z" /></svg>
        </CardHeader>
        <CardContent className='pb-0'>
         <ChartContainer config={chartConfig} className="h-[100px] w-full">
            <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 0, top: 0, right: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="status" type="category" tickLine={false} tick={false} axisLine={false} />
                <Bar dataKey="tickets" layout="vertical" stackId="a" radius={5}>
                   <LabelList dataKey="tickets" position="insideRight" offset={8} className="fill-white" fontSize={12} />
                </Bar>
            </BarChart>
        </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
