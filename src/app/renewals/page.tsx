
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type TrackedItem, type TrackedItemType, type Folder } from '@/types';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, Trash2, Camera, Upload, X, FileText, Edit, Search, Eye, Folder as FolderIcon, MoreVertical, FolderPlus, ArrowLeft, Archive, FileSpreadsheet } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isValid, getYear } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FolderDialog } from './_components/folder-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';
import { YearlyReportDialog } from './_components/yearly-report-dialog';

const renewalSchema = z.object({
  itemName: z.string().min(2, 'Item name is required.'),
  type: z.enum(['Warranty', 'Renewal']),
  purchaseDate: z.date({ required_error: 'Purchase date is required.' }),
  expiryDate: z.date({ required_error: 'Expiry date is required.' }),
  amount: z.coerce.number().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  attachment: z.string().optional(),
  attachmentName: z.string().optional(),
  folderId: z.string().optional(),
});

type RenewalFormValues = z.infer<typeof renewalSchema>;

export default function RenewalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { data: renewals, add: addRenewal, update: updateRenewal, removeById: deleteRenewal, loading: renewalsLoading } = useDatabaseList<TrackedItem>('renewals');
  const { data: folders, add: addFolder, update: updateFolder, removeById: deleteFolder, loading: foldersLoading } = useDatabaseList<Folder>('folders');
  
  const [dialogState, setDialogState] = useState<{ open: boolean, mode: 'add' | 'edit' | 'view', item: TrackedItem | null }>({ open: false, mode: 'add', item: null });
  const { toast } = useToast();

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewingAttachment, setViewingAttachment] = useState<{url: string; name?: string;} | null>(null);
  const [renewalToDelete, setRenewalToDelete] = useState<TrackedItem | null>(null);
  
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  
  const [view, setView] = useState<'folders' | 'items'>('folders');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  
  const [isYearlyReportDialogOpen, setIsYearlyReportDialogOpen] = useState(false);


  const form = useForm<RenewalFormValues>({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      itemName: '',
      type: 'Warranty',
      notes: '',
      vendor: '',
      amount: undefined,
      attachment: '',
      attachmentName: '',
      folderId: 'no-folder',
    },
  });
  
  const attachmentValue = form.watch('attachment');
  
  const attachmentPreviewInfo = useMemo(() => {
    let currentAttachment = attachmentValue;
    let currentAttachmentName = form.getValues('attachmentName');

    if (dialogState.mode === 'view' && dialogState.item) {
        currentAttachment = dialogState.item.attachment;
        currentAttachmentName = dialogState.item.attachmentName;
    }
    
    if (!currentAttachment) return null;
    
    const isPdf = currentAttachment.startsWith('data:application/pdf');
    const isImage = currentAttachment.startsWith('data:image');
    
    return {
      url: currentAttachment,
      name: currentAttachmentName || (isPdf ? 'document.pdf' : 'image.png'),
      isPdf: isPdf,
      isImage: isImage,
    };
  }, [attachmentValue, form, dialogState.mode, dialogState.item]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (dialogState.open && dialogState.item) {
      form.reset({
        itemName: dialogState.item.itemName,
        type: dialogState.item.type,
        purchaseDate: new Date(dialogState.item.purchaseDate),
        expiryDate: new Date(dialogState.item.expiryDate),
        amount: dialogState.item.amount ?? undefined,
        vendor: dialogState.item.vendor ?? '',
        notes: dialogState.item.notes ?? '',
        attachment: dialogState.item.attachment ?? '',
        attachmentName: dialogState.item.attachmentName ?? '',
        folderId: dialogState.item.folderId || 'no-folder',
      });
    } else {
      form.reset({
        itemName: '',
        type: 'Warranty',
        purchaseDate: undefined,
        expiryDate: undefined,
        amount: undefined,
        vendor: '',
        notes: '',
        attachment: '',
        attachmentName: '',
        folderId: selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'unfoldered' ? selectedFolderId : 'no-folder',
      });
    }
  }, [dialogState, form, selectedFolderId]);

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
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [isCameraOpen, toast]);
  
  const isLoading = !isClient || authLoading || renewalsLoading || foldersLoading;

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        form.setValue('attachment', result);
        form.setValue('attachmentName', file.name);
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
        form.setValue('attachmentName', `capture-${Date.now()}.png`);
      }
      setIsCameraOpen(false);
    }
  };
  
  const removeAttachment = () => {
    form.setValue('attachment', '');
    form.setValue('attachmentName', '');
    const fileInput = document.getElementById('attachment-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  }

  const onSubmit = (data: RenewalFormValues) => {
     const renewalData: Omit<TrackedItem, 'id' | 'createdAt'> = {
      ...data,
      purchaseDate: data.purchaseDate.toISOString(),
      expiryDate: data.expiryDate.toISOString(),
      amount: data.amount ?? undefined,
      vendor: data.vendor ?? '',
      notes: data.notes ?? '',
      folderId: data.folderId === 'no-folder' ? '' : data.folderId,
    };

    if (dialogState.mode === 'edit' && dialogState.item) {
      updateRenewal(dialogState.item.id, renewalData);
      toast({ title: 'Success', description: 'Item updated.' });
    } else {
      addRenewal({...renewalData, createdAt: new Date().toISOString()});
      toast({ title: 'Success', description: 'New item added.' });
    }
    
    form.reset();
    setDialogState({ open: false, mode: 'add', item: null });
  };
  
  const handleOpenDialog = (mode: 'add' | 'edit' | 'view', item: TrackedItem | null) => {
    setDialogState({ open: true, mode, item });
  };
  
  const handleDeleteRenewal = () => {
    if (!renewalToDelete) return;
    deleteRenewal(renewalToDelete.id);
    toast({ title: 'Success', description: `Item "${renewalToDelete.itemName}" deleted.` });
    setRenewalToDelete(null);
  };
  
  const handleFolderSubmit = (values: { name: string }) => {
    if (editingFolder) {
      updateFolder(editingFolder.id, { ...editingFolder, ...values });
      toast({ title: 'Folder Updated', description: `Folder "${values.name}" has been updated.` });
    } else {
      addFolder({ ...values, createdAt: new Date().toISOString() });
      toast({ title: 'Folder Created', description: `Folder "${values.name}" has been created.` });
    }
    setIsFolderDialogOpen(false);
    setEditingFolder(null);
  };

  const handleDeleteFolder = () => {
    if (!folderToDelete) return;
    
    renewals.forEach(item => {
        if (item.folderId === folderToDelete.id) {
            updateRenewal(item.id, { ...item, folderId: '' });
        }
    });

    deleteFolder(folderToDelete.id);
    toast({ title: 'Folder Deleted', description: `Folder "${folderToDelete.name}" has been deleted.` });
    setFolderToDelete(null);
  };


  const getDaysLeft = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    if (!isValid(expiry)) return 'Invalid Date';
    const days = differenceInDays(expiry, new Date());
    if (days < -1) return `Expired ${Math.abs(days)} days ago`;
    if (days === -1) return 'Expired yesterday';
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    return `${days} day(s)`;
  }
  
  const openFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setView('items');
    setItemSearch('');
    setSelectedItems({});
  }

  const filteredFolders = useMemo(() => {
    return folders.filter(folder => folder.name.toLowerCase().includes(folderSearch.toLowerCase()));
  }, [folders, folderSearch]);

  const displayedRenewals = useMemo(() => {
    let items;
    if (selectedFolderId === 'all') {
        items = renewals;
    } else if (selectedFolderId === 'unfoldered') {
        items = renewals.filter(item => !item.folderId);
    } else {
        items = renewals.filter(item => item.folderId === selectedFolderId);
    }
    return items.filter(item => item.itemName.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [renewals, selectedFolderId, itemSearch]);

  const sortedRenewals = useMemo(() => {
    return [...displayedRenewals].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [displayedRenewals]);

  const currentFolderName = useMemo(() => {
    if (view === 'items') {
        if (selectedFolderId === 'all') return 'All Items';
        if (selectedFolderId === 'unfoldered') return 'Items without a folder';
        return folders.find(f => f.id === selectedFolderId)?.name || 'Folder';
    }
    return 'Renewals & Warranties';
  }, [view, selectedFolderId, folders]);

  const handleSelectionChange = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelectedItems: Record<string, boolean> = {};
    if (checked) {
      sortedRenewals.forEach(item => {
        newSelectedItems[item.id] = true;
      });
    }
    setSelectedItems(newSelectedItems);
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  const handleGenerateReport = () => {
    const itemsToExport = sortedRenewals.filter(item => selectedItems[item.id]);
    if (itemsToExport.length === 0) {
        toast({ title: 'No items selected', description: 'Please select items to generate a report.', variant: 'destructive' });
        return;
    }

    let totalAmount = 0;
    const data = itemsToExport.map((item, index) => {
        const amount = item.amount ?? 0;
        totalAmount += amount;
        const purchaseD = new Date(item.purchaseDate);
        return {
            'Sr. No.': index + 1,
            'Date of Purchase': isValid(purchaseD) ? format(purchaseD, 'dd-MM-yyyy') : 'N/A',
            'Department': 'IT',
            'Location': 'Vahuli Village, Padgha, Bhiwandi',
            'Detail': item.itemName,
            'Vendor name': item.vendor ?? 'N/A',
            'Amount': `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-`,
            'Release': `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-`,
        };
    });

    const totalRow = {
        'Detail': 'Gross Total Rs',
        'Amount': `${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-`
    };
    
    const ws = XLSX.utils.json_to_sheet([], {
        header: ['Sr. No.', 'Date of Purchase', 'Department', 'Location', 'Detail', 'Vendor name', 'Amount', 'Release'],
    });

    XLSX.utils.sheet_add_aoa(ws, [['Request for payment release']], { origin: 'D1' });
    
    XLSX.utils.sheet_add_json(ws, data, {
        skipHeader: true,
        origin: 'A3',
    });

    XLSX.utils.sheet_add_json(ws, [totalRow], {
        header: ['Detail', 'Amount'],
        skipHeader: true,
        origin: -1,
    });
    
    if (ws['D1']) {
      ws['!merges'] = [{ s: { r: 0, c: 3 }, e: { r: 0, c: 6 } }];
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Request');
    XLSX.writeFile(wb, 'Payment_Request.xlsx');

    toast({ title: 'Report Generated', description: 'The payment request has been exported.' });
  };
  
  const handleGenerateYearlyReport = (year: number) => {
    const itemsForYear = renewals.filter(item => {
        const purchaseDate = new Date(item.purchaseDate);
        return isValid(purchaseDate) && getYear(purchaseDate) === year;
    });

    if (itemsForYear.length === 0) {
        toast({ title: 'No Data', description: `No items found with a purchase year of ${year}.` });
        return;
    }

    let totalAmount = 0;
    const data = itemsForYear.map((item, index) => {
        const amount = item.amount ?? 0;
        totalAmount += amount;
        const purchaseD = new Date(item.purchaseDate);
        return {
            'Sr. No.': index + 1,
            'Date of Purchase': isValid(purchaseD) ? format(purchaseD, 'dd-MM-yyyy') : 'N/A',
            'Department': 'IT',
            'Location': 'Vahuli Village, Padgha, Bhiwandi',
            'Detail': item.itemName,
            'Vendor name': item.vendor ?? 'N/A',
            'Amount': `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-`,
            'Release': `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-`,
        };
    });

    const totalRow = {
        'Detail': 'Gross Total Rs',
        'Amount': `${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-`
    };

    const ws_name = `Renewals ${year}`;
    const ws = XLSX.utils.json_to_sheet([], {
        header: ['Sr. No.', 'Date of Purchase', 'Department', 'Location', 'Detail', 'Vendor name', 'Amount', 'Release'],
    });
    
    XLSX.utils.sheet_add_json(ws, data, { skipHeader: true, origin: 'A2' });
    XLSX.utils.sheet_add_json(ws, [totalRow], { header: ['Detail', 'Amount'], skipHeader: true, origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ws_name);
    XLSX.writeFile(wb, `Renewals_Report_${year}.xlsx`);

    toast({ title: 'Yearly Report Generated', description: `Report for ${year} has been exported.` });
  };


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
  
  const dialogTitle = {
    add: 'Add New Item',
    edit: 'Edit Item',
    view: 'View Item Details',
  };

  const renderFoldersView = () => (
    <>
      <div className="flex flex-wrap items-center gap-2 w-full">
          <div className="relative flex-grow min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Search folders..."
                  className="pl-8"
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
              />
          </div>
           <div className="flex gap-2">
            <Button onClick={() => setIsFolderDialogOpen(true)} variant="outline" className="whitespace-nowrap">
                <FolderPlus className="mr-2 h-4 w-4" /> Folder
            </Button>
            <Button onClick={() => setIsYearlyReportDialogOpen(true)} variant="outline" className="whitespace-nowrap">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Yearly Report
            </Button>
           </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* All Items Folder */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFolder('all')}>
            <CardContent className="p-4 flex items-center gap-3">
                <Archive className="h-6 w-6 text-muted-foreground" />
                <span className="font-medium truncate">All Items</span>
            </CardContent>
        </Card>
        
        {/* Unfoldered Items */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFolder('unfoldered')}>
            <CardContent className="p-4 flex items-center gap-3">
                <FolderIcon className="h-6 w-6 text-muted-foreground" />
                <span className="font-medium truncate">Items without a folder</span>
            </CardContent>
        </Card>

        {filteredFolders.map(folder => (
            <Card key={folder.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openFolder(folder.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FolderIcon className="h-6 w-6 text-muted-foreground" />
                        <span className="font-medium truncate">{folder.name}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setIsFolderDialogOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder);}} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardContent>
            </Card>
        ))}
      </div>
      {filteredFolders.length === 0 && folderSearch && (
         <p className="text-center text-muted-foreground">No folders match your search.</p>
      )}
    </>
  );

  const renderItemsView = () => (
    <>
      <div className="flex items-center gap-2 w-full">
          <Button variant="outline" size="icon" onClick={() => setView('folders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Search items in this folder..."
                  className="pl-8"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
              />
          </div>
          <Button onClick={() => handleOpenDialog('add', null)} className="whitespace-nowrap">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
          <Button onClick={handleGenerateReport} disabled={selectedCount === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Generate Report
          </Button>
      </div>
       <Table>
          <TableHeader>
          <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={sortedRenewals.length > 0 && selectedCount === sortedRenewals.length}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
              </TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead className="text-right">Actions</TableHead>
          </TableRow>
          </TableHeader>
          <TableBody>
          {sortedRenewals.length > 0 ? (
            sortedRenewals.map((renewal) => {
              const purchaseD = new Date(renewal.purchaseDate);
              const expiryD = new Date(renewal.expiryDate);

              return (
                  <TableRow key={renewal.id}>
                      <TableCell>
                          <Checkbox
                              checked={selectedItems[renewal.id] || false}
                              onCheckedChange={(checked) => handleSelectionChange(renewal.id, Boolean(checked))}
                          />
                      </TableCell>
                      <TableCell className="font-medium">{renewal.itemName}</TableCell>
                      <TableCell>{renewal.type}</TableCell>
                      <TableCell>{isValid(purchaseD) ? format(purchaseD, 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{isValid(expiryD) ? format(expiryD, 'PPP') : 'N/A'}</TableCell>
                      <TableCell>{getDaysLeft(renewal.expiryDate)}</TableCell>
                      <TableCell className="text-right space-x-0.5">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('view', renewal)}>
                              <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('edit', renewal)}>
                              <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setRenewalToDelete(renewal)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </TableCell>
                  </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center h-24">
                  {itemSearch ? "No items match your search." : "This folder is empty."}
              </TableCell>
            </TableRow>
          )}
          </TableBody>
      </Table>
    </>
  );

  return (
    <>
    <div className="container mx-auto space-y-6">
       <Card>
        <CardHeader>
            <CardTitle>{currentFolderName}</CardTitle>
            <CardDescription>
                {view === 'folders' ? 'Select a folder to view items or add a new folder.' : `Viewing items in ${currentFolderName}.`}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {view === 'folders' ? renderFoldersView() : renderItemsView()}
        </CardContent>
       </Card>
       
        <Dialog open={dialogState.open} onOpenChange={(open) => setDialogState({...dialogState, open})}>
            <DialogContent 
                className="sm:max-w-md grid-rows-[auto_1fr_auto] p-0 max-h-[90svh]"
                onInteractOutside={(e) => {
                    if (dialogState.mode !== 'view') {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>{dialogTitle[dialogState.mode]}</DialogTitle>
                     {dialogState.mode !== 'view' && (
                        <DialogDescription>
                           {dialogState.mode === 'edit' ? 'Update the details for this item.' : 'Fill in the details below to track a new item.'}
                        </DialogDescription>
                     )}
                </DialogHeader>
                <ScrollArea className="h-full">
                    <div className="p-6">
                        <Form {...form}>
                            <form id="renewal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <fieldset disabled={dialogState.mode === 'view'} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="folderId"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Folder</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Select a folder" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="no-folder">No Folder</SelectItem>
                                                {folders.map((folder) => (
                                                <SelectItem key={folder.id} value={folder.id}>
                                                    {folder.name}
                                                </SelectItem>
                                                ))}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                            <FormLabel>Type</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex space-x-4"
                                                >
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                    <RadioGroupItem value="Warranty" id="r1" />
                                                    </FormControl>
                                                    <FormLabel htmlFor="r1" className="font-normal">Warranty</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2">
                                                    <FormControl>
                                                    <RadioGroupItem value="Renewal" id="r2" />
                                                    </FormControl>
                                                    <FormLabel htmlFor="r2" className="font-normal">Renewal</FormLabel>
                                                </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />

                                    <FormField
                                    control={form.control}
                                    name="itemName"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Item Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Server Hosting" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Amount</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g. 299.99" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="vendor"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Vendor</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Cloudways" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
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
                                                    {field.value && isValid(field.value) ? (
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
                                        name="expiryDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>{form.getValues('type')} Date</FormLabel>
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
                                                    {field.value && isValid(field.value) ? (
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
                                        {dialogState.mode !== 'view' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input id="attachment-upload" type="file" accept="image/*,application/pdf" onChange={handlePhotoUpload} className="hidden" />
                                                <Button type="button" variant="outline" onClick={() => document.getElementById('attachment-upload')?.click()}>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload
                                                </Button>
                                                <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}>
                                                    <Camera className="mr-2 h-4 w-4" />
                                                    Capture
                                                </Button>
                                            </div>
                                        )}
                                        {attachmentPreviewInfo && (
                                            <div className="relative mt-2 w-full p-2 rounded-md border">
                                                {attachmentPreviewInfo.isImage && (
                                                     <Image src={attachmentPreviewInfo.url} alt="Attachment preview" width={400} height={300} className="w-full h-auto rounded-md" />
                                                )}
                                                {attachmentPreviewInfo.isPdf && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" onClick={() => setViewingAttachment({url: attachmentPreviewInfo.url, name: attachmentPreviewInfo.name})}>
                                                       <FileText className="h-6 w-6" />
                                                       <span className='truncate'>{attachmentPreviewInfo.name}</span>
                                                    </div>
                                                )}
                                                {dialogState.mode !== 'view' && (
                                                    <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={removeAttachment}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                         {!attachmentPreviewInfo && dialogState.mode === 'view' && (
                                            <p className="text-sm text-muted-foreground">No attachment.</p>
                                        )}
                                    </FormItem>
                                    <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Notes (optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g. Purchased from ExampleHost" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                </fieldset>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-0">
                    <DialogClose asChild>
                         <Button variant="outline" onClick={() => setDialogState({open: false, mode: 'add', item: null})}>Cancel</Button>
                    </DialogClose>
                    {dialogState.mode !== 'view' && (
                        <Button type="submit" form="renewal-form">{dialogState.mode === 'edit' ? 'Save Changes' : 'Add Item'}</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>

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

        <Dialog open={!!viewingAttachment} onOpenChange={(open) => !open && setViewingAttachment(null)}>
            <DialogContent className="max-w-3xl h-[80vh]">
                 <DialogHeader>
                    <DialogTitle>Attachment: {viewingAttachment?.name}</DialogTitle>
                 </DialogHeader>
                 {viewingAttachment && (
                     <ScrollArea className="h-full w-full rounded-md border mt-4">
                        {viewingAttachment.url.startsWith('data:image') && (
                            <Image src={viewingAttachment.url} alt="Attachment" width={1200} height={1200} className="w-full h-auto" />
                        )}
                         {viewingAttachment.url.startsWith('data:application/pdf') && (
                            <embed src={viewingAttachment.url} type="application/pdf" width="100%" height="100%" className='h-full min-h-[70vh]' />
                        )}
                    </ScrollArea>
                 )}
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!renewalToDelete} onOpenChange={() => setRenewalToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the item "{renewalToDelete?.itemName}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRenewalToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRenewal} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
      
      <FolderDialog
        isOpen={isFolderDialogOpen}
        onOpenChange={setIsFolderDialogOpen}
        onSubmit={handleFolderSubmit}
        editingFolder={editingFolder}
      />
      
      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the folder "{folderToDelete?.name}". Any items inside will be moved to the main list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <YearlyReportDialog
        isOpen={isYearlyReportDialogOpen}
        onOpenChange={setIsYearlyReportDialogOpen}
        onSubmit={handleGenerateYearlyReport}
      />
    </div>
    </>
  );
}
