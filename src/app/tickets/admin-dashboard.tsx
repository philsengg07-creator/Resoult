
'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { type Ticket, type Renewal } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { differenceInDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface AdminDashboardProps {
  tickets: Ticket[];
  renewals: Renewal[];
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

export function AdminDashboard({ tickets, renewals }: AdminDashboardProps) {
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

  const upcomingRenewals = useMemo(() => {
    return renewals
      .map(renewal => ({
        ...renewal,
        daysLeft: differenceInDays(new Date(renewal.renewalDate), new Date()),
      }))
      .filter(renewal => renewal.daysLeft >= 0 && renewal.daysLeft <= 10)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [renewals]);

  const totalTickets = tickets.length;
  const activeTickets = ticketCounts.Unopened + ticketCounts.Open + ticketCounts['In Progress'];

  const chartData = [
    { status: 'Unopened', tickets: ticketCounts.Unopened, fill: 'var(--color-Unopened)' },
    { status: 'Open', tickets: ticketCounts.Open, fill: 'var(--color-Open)' },
    { status: 'In Progress', tickets: ticketCounts['In Progress'], fill: 'var(--color-In Progress)' },
    { status: 'Closed', tickets: ticketCounts.Closed, fill: 'var(--color-Closed)' },
  ];

  return (
    <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
                <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
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
            <Card className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Upcoming Renewals</CardTitle>
                        <CardDescription>Items with warranty ending in the next 10 days.</CardDescription>
                    </div>
                     <Button asChild variant="outline" size="sm">
                        <Link href="/renewals">View All</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {upcomingRenewals.length > 0 ? (
                    <ul className="space-y-2">
                        {upcomingRenewals.map(renewal => (
                        <li key={renewal.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                            <div>
                                <p className="font-medium">{renewal.itemName}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(renewal.renewalDate), 'PPP')}</p>
                            </div>
                            <span className={`font-semibold ${renewal.daysLeft < 3 ? 'text-destructive' : ''}`}>
                                {renewal.daysLeft === 0 ? 'Today' : `${renewal.daysLeft}d left`}
                            </span>
                        </li>
                        ))}
                    </ul>
                    ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No items are up for renewal in the next 10 days.
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
