
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Renewal } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const renewalSchema = z.object({
  itemName: z.string().min(2, 'Item name is required.'),
  purchaseDate: z.date({ required_error: 'Purchase date is required.' }),
  renewalDate: z.date({ required_error: 'Renewal date is required.' }),
  notes: z.string().optional(),
});

type RenewalFormValues = z.infer<typeof renewalSchema>;

export default function RenewalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [renewals, setRenewals] = useLocalStorage<Renewal[]>('renewals', []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<RenewalFormValues>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      itemName: '',
      notes: '',
    },
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !user) {
      router.push('/role-selection');
    } else if (isClient && user?.role === 'Employee') {
      router.push('/tickets/new');
    }
  }, [user, isClient, router]);

  const onSubmit = (data: RenewalFormValues) => {
    const newRenewal: Renewal = {
      id: crypto.randomUUID(),
      itemName: data.itemName,
      purchaseDate: data.purchaseDate.toISOString(),
      renewalDate: data.renewalDate.toISOString(),
      notes: data.notes,
    };
    setRenewals([...renewals, newRenewal]);
    toast({ title: 'Success', description: 'Renewal item added.' });
    form.reset();
    setIsFormOpen(false);
  };
  
  const deleteRenewal = (id: string) => {
    setRenewals(renewals.filter(r => r.id !== id));
    toast({ title: 'Success', description: 'Renewal item deleted.' });
  }

  const getDaysLeft = (renewalDate: string) => {
    const days = differenceInDays(new Date(renewalDate), new Date());
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    return `${days} day(s)`;
  }

  if (!isClient || !user || user.role !== 'Admin') {
    return null;
  }

  const sortedRenewals = [...renewals].sort(
    (a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()
  );

  return (
    <div className="container mx-auto space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Renewal Management</CardTitle>
                <CardDescription>Track warranty and renewal dates for your items.</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" />
                    Add Item
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Renewal Item</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to track a new item.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="itemName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Domain SSL Certificate" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                        control={form.control}
                        name="purchaseDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Purchase Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={'outline'}
                                    className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                    date > new Date() || date < new Date('1900-01-01')
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="renewalDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Renewal/Warranty Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={'outline'}
                                    className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, 'PPP')
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g. Purchased from ExampleHost" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit">Add Renewal</Button>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Renewal Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedRenewals.length > 0 ? (
                  sortedRenewals.map((renewal) => (
                    <TableRow key={renewal.id}>
                      <TableCell className="font-medium">{renewal.itemName}</TableCell>
                      <TableCell>{format(new Date(renewal.purchaseDate), 'PPP')}</TableCell>
                      <TableCell>{format(new Date(renewal.renewalDate), 'PPP')}</TableCell>
                      <TableCell>{getDaysLeft(renewal.renewalDate)}</TableCell>
                       <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteRenewal(renewal.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No renewal items added yet.
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
       </Card>
    </div>
  );
}
