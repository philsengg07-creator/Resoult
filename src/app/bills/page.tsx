'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Bill } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Download, Trash2, FileText, Upload } from 'lucide-react';
import Image from 'next/image';

const billSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  description: z.string().min(3, { message: 'Description must be at least 3 characters.' }),
});

export default function BillsPage() {
  const { toast } = useToast();
  const [bills, setBills] = useLocalStorage<Bill[]>('bills', []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof billSchema>>({
    resolver: zodResolver(billSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], description: '' },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (values: z.infer<typeof billSchema>) => {
    const newBill: Bill = {
      id: crypto.randomUUID(),
      ...values,
      createdAt: new Date().toISOString(),
      file: filePreview ?? undefined,
    };
    setBills((prev) => [...prev, newBill]);
    toast({ title: 'Bill Added', description: 'Your bill has been saved successfully.' });
    form.reset();
    setFilePreview(null);
    setIsFormOpen(false);
  };
  
  const deleteBill = (id: string) => {
    setBills(bills.filter(bill => bill.id !== id));
    toast({ title: 'Bill Deleted', variant: 'destructive' });
  };
  
  const sortedBills = [...bills].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bill Storage</CardTitle>
            <CardDescription>Manage your bills and scanned copies.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Bill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Bill</DialogTitle>
                <DialogDescription>Fill in the details for the new bill.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="e.g. Office Printer" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Scanned Copy (optional)</FormLabel>
                    <FormControl>
                        <Input id="file-upload" type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="w-full">
                        <Upload className="mr-2 h-4 w-4" /> Upload File
                    </Button>
                    {filePreview && filePreview.startsWith("data:image") && (
                        <div className="mt-2 rounded-md border p-2">
                           <Image src={filePreview} alt="File preview" width={100} height={100} className="w-full h-auto rounded-md" />
                        </div>
                    )}
                     {filePreview && filePreview.startsWith("data:application/pdf") && (
                        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2 border rounded-md p-2">
                           <FileText className="h-5 w-5 text-destructive" /> PDF file selected.
                        </div>
                    )}
                  </FormItem>
                  <Button type="submit" className="w-full">Save Bill</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBills.length > 0 ? (
                sortedBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{format(new Date(bill.date), 'PPP')}</TableCell>
                    <TableCell>{bill.description}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {bill.file && (
                        <Button asChild variant="outline" size="icon">
                           <a href={bill.file} download={`bill-${bill.date}.png`}>
                                <Download className="h-4 w-4" />
                           </a>
                        </Button>
                      )}
                      <Button variant="destructive" size="icon" onClick={() => deleteBill(bill.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">No bills found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
