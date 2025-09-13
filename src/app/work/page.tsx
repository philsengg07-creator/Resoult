
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type WorkItem, type WorkStatus } from '@/types';
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
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';


const workSchema = z.object({
  description: z.string().min(5, 'Description is required and must be at least 5 characters.'),
  status: z.enum(['Pending', 'In Process', 'Finished']),
});

type WorkFormValues = z.infer<typeof workSchema>;

const statusColors: Record<WorkStatus, string> = {
  'Pending': 'bg-yellow-500',
  'In Process': 'bg-blue-500',
  'Finished': 'bg-green-500',
};

export default function WorkPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { data: workItems, add: addWorkItem, update: updateWorkItem, removeById: deleteWorkItem, loading: workItemsLoading } = useDatabaseList<WorkItem>('work');
  const [dialogState, setDialogState] = useState<{ open: boolean, mode: 'add' | 'edit', item: WorkItem | null }>({ open: false, mode: 'add', item: null });
  const { toast } = useToast();
  const [itemToDelete, setItemToDelete] = useState<WorkItem | null>(null);

  const form = useForm<WorkFormValues>({
    resolver: zodResolver(workSchema),
    defaultValues: {
      description: '',
      status: 'Pending',
    },
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (dialogState.open && dialogState.item) {
      form.reset({
        description: dialogState.item.description,
        status: dialogState.item.status,
      });
    } else {
      form.reset({
        description: '',
        status: 'Pending',
      });
    }
  }, [dialogState, form]);

  useEffect(() => {
    if (isClient && !authLoading) {
      if (!user) {
        router.push('/role-selection');
      } else if (user?.role === 'Employee') {
        router.push('/tickets/new');
      }
    }
  }, [user, isClient, router, authLoading]);

  const onSubmit = (data: WorkFormValues) => {
    if (dialogState.mode === 'edit' && dialogState.item) {
      const updatedData: Partial<WorkItem> = {
        description: data.description,
        status: data.status,
      }
      updateWorkItem(dialogState.item.id, updatedData);
      toast({ title: 'Success', description: 'Work item updated.' });
    } else {
      const newWorkItem: Omit<WorkItem, 'id'> = {
        ...data,
        createdAt: new Date().toISOString(),
      };
      addWorkItem(newWorkItem);
      toast({ title: 'Success', description: 'New work item added.' });
    }
    
    form.reset();
    setDialogState({ open: false, mode: 'add', item: null });
  };
  
  const handleOpenDialog = (mode: 'add' | 'edit', item: WorkItem | null) => {
    setDialogState({ open: true, mode, item });
  };
  
  const handleDeleteWorkItem = () => {
    if (!itemToDelete) return;
    if (itemToDelete.status !== 'Finished') {
      toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'Only finished work items can be deleted.' });
      return;
    }
    deleteWorkItem(itemToDelete.id);
    toast({ title: 'Success', description: `Work item deleted.` });
    setItemToDelete(null);
  };

  const isLoading = !isClient || authLoading || workItemsLoading;

  if (isLoading) {
    return (
        <div className="container mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  if (!user || user.role !== 'Admin') {
    return null;
  }

  const sortedWorkItems = [...workItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const dialogTitle = {
    add: 'Add New Work Item',
    edit: 'Edit Work Item',
  };

  return (
    <div className="container mx-auto space-y-6">
       <Card>
        <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Work Management</CardTitle>
                <CardDescription>Track ongoing and finished work items.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog('add', null)} className="whitespace-nowrap">
                <PlusCircle className="mr-2" />
                Add Work
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className='w-[60%]'>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedWorkItems.length > 0 ? (
                  sortedWorkItems.map((item) => {
                    const createdD = new Date(item.createdAt);

                    return (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell><Badge className={statusColors[item.status]}>{item.status}</Badge></TableCell>
                            <TableCell>{format(createdD, 'PPP')}</TableCell>
                            <TableCell className="text-right space-x-0.5">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', item)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)} disabled={item.status !== 'Finished'}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No work items yet.
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
       </Card>
       
        <Dialog open={dialogState.open} onOpenChange={(open) => setDialogState({ ...dialogState, open })}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{dialogTitle[dialogState.mode]}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Form {...form}>
                        <form id="work-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe the work to be done..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Status</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a status" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="In Process">In Process</SelectItem>
                                            <SelectItem value="Finished">Finished</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>
                <DialogFooter>
                    <Button type="submit" form="work-form">{dialogState.mode === 'edit' ? 'Save Changes' : 'Add Work'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this work item.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteWorkItem} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
