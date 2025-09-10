
'use client';
import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Download, Trash2, FileText, Upload } from 'lucide-react';
import Image from 'next/image';

const billSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  description: z.string().min(3, { message: 'Description must be at least 3 characters.' }),
});

const months = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', 'label': 'June' },
  { value: '7', 'label': 'July' },
  { value: '8', 'label': 'August' },
  { value: '9', 'label': 'September' },
  { value: '10', 'label': 'October' },
  { value: '11', 'label': 'November' },
  { value: '12', 'label': 'December' },
];

export default function BillsPage() {
  const { toast } = useToast();
  const [bills, setBills] = useLocalStorage<Bill[]>('bills', []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  const form = useForm<z.infer<typeof billSchema>>({
    resolver: zodResolver(billSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], description: '' },
  });

  const availableYears = useMemo(() => {
    const years = new Set(bills.map(bill => new Date(bill.date).getFullYear().toString()));
    const currentYear = new Date().getFullYear().toString();
    if (!years.has(currentYear)) {
      years.add(currentYear);
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [bills]);

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
  
  const filteredBills = useMemo(() => {
    return [...bills]
      .filter(bill => {
        const billDate = new Date(bill.date);
        return billDate.getFullYear().toString() === selectedYear && (billDate.getMonth() + 1).toString() === selectedMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bills, selectedYear, selectedMonth]);

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Bill Storage</CardTitle>
                <CardDescription>Manage your bills and scanned copies.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="grid grid-cols-2 gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger>
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
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
              </div>
          </div>
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
              {filteredBills.length > 0 ? (
                filteredBills.map((bill) => (
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
                  <TableCell colSpan={3} className="text-center h-24">No bills found for the selected period.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
