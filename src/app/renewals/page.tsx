
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useDatabaseList } from '@/hooks/use-database-list';
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
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, Trash2, Camera, Upload, X, Paperclip } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


const renewalSchema = z.object({
  itemName: z.string().min(2, 'Item name is required.'),
  purchaseDate: z.date({ required_error: 'Purchase date is required.' }),
  renewalDate: z.date({ required_error: 'Renewal date is required.' }),
  notes: z.string().optional(),
  attachment: z.string().optional(),
});

type RenewalFormValues = z.infer<typeof renewalSchema>;

export default function RenewalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { data: renewals, add: addRenewal, removeById: deleteRenewal, loading: renewalsLoading } = useDatabaseList<Renewal>('renewals');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<RenewalFormValues>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      itemName: '',
      notes: '',
      attachment: '',
    },
  });
  
  const attachmentPreview = form.watch('attachment');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !authLoading) {
      if (!user) {
        router.push('/role-selection');
      } else if (user?.role === 'Employee') {
        router.push('/tickets/new');
      }
    }
  }, [user, isClient, router, authLoading]);
  
  useEffect(() => {
    if (isCameraOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
        }
      };
      getCameraPermission();
    } else {
        // Stop camera stream when dialog is closed
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [isCameraOpen, toast]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('attachment', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/png');
        form.setValue('attachment', dataUrl);
      }
      setIsCameraOpen(false);
    }
  };
  
  const removeAttachment = () => {
    form.setValue('attachment', '');
    const fileInput = document.getElementById('attachment-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  }

  const onSubmit = (data: RenewalFormValues) => {
    const newRenewal: Omit<Renewal, 'id'> = {
      itemName: data.itemName,
      purchaseDate: data.purchaseDate.toISOString(),
      renewalDate: data.renewalDate.toISOString(),
      notes: data.notes,
      attachment: data.attachment,
    };
    addRenewal(newRenewal);
    toast({ title: 'Success', description: 'Renewal item added.' });
    form.reset();
    setIsFormOpen(false);
  };

  const getDaysLeft = (renewalDate: string) => {
    const days = differenceInDays(new Date(renewalDate), new Date());
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    return `${days} day(s)`;
  }

  const isLoading = !isClient || authLoading || renewalsLoading;

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
            <DialogContent className="sm:max-w-md">
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
                     <FormItem>
                        <FormLabel>Attachment (optional)</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                           <Input id="attachment-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                           <Button type="button" variant="outline" onClick={() => document.getElementById('attachment-upload')?.click()}>
                             <Upload className="mr-2 h-4 w-4" />
                             Upload
                           </Button>
                           <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}>
                             <Camera className="mr-2 h-4 w-4" />
                             Capture
                           </Button>
                        </div>
                        {attachmentPreview && (
                            <div className="relative mt-2 w-full aspect-video rounded-md overflow-hidden border">
                                <Image src={attachmentPreview} alt="Attachment preview" layout="fill" objectFit="contain" />
                                <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={removeAttachment}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </FormItem>
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
                    <TableHead className="text-right">Actions</TableHead>
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
                       <TableCell className="text-right">
                        {renewal.attachment && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={renewal.attachment} target="_blank" rel="noopener noreferrer">
                              <Paperclip className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
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

        {/* Camera Capture Dialog */}
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Capture Photo</DialogTitle>
                    <DialogDescription>Position the item in front of the camera and capture.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4">
                   <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                   <canvas ref={canvasRef} className="hidden" />
                   {hasCameraPermission === false && (
                     <Alert variant="destructive">
                       <AlertTitle>Camera Access Denied</AlertTitle>
                       <AlertDescription>
                         Please allow camera access in your browser settings to use this feature.
                       </AlertDescription>
                     </Alert>
                   )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCapturePhoto} disabled={!hasCameraPermission}>Take Photo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    