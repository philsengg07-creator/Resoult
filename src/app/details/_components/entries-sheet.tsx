
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { type CustomForm, type FormEntry, type CustomFormField } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { ScrollArea } from '@/components/ui/scroll-area';


interface EntriesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: CustomForm;
  entries: FormEntry[];
  onAddEntry: (entry: Omit<FormEntry, 'id'>) => void;
  onUpdateEntry: (id: string, entry: Partial<FormEntry>) => void;
  onDeleteEntry: (id: string) => void;
  encrypt: (text: string) => string;
  decrypt: (ciphertext: string) => string;
}

function encryptObject(obj: any, encryptFn: (text: string) => string): any {
    if (typeof obj !== 'object' || obj === null) {
        return encryptFn(String(obj));
    }
    const encryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                encryptedObj[key] = encryptObject(value, encryptFn);
            } else {
                encryptedObj[key] = encryptFn(String(value));
            }
        }
    }
    return encryptedObj;
}

function decryptObject(obj: any, decryptFn: (text: string) => string): any {
    if (typeof obj !== 'object' || obj === null) {
        try { return decryptFn(obj); } catch { return obj; }
    }
    const decryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                decryptedObj[key] = decryptObject(value, decryptFn);
            } else {
                 try { decryptedObj[key] = decryptFn(value); } catch { decryptedObj[key] = value; }
            }
        }
    }
    return decryptedObj;
}

function checkRequiredFields(fields: CustomFormField[], data: Record<string, any>): string | null {
    for (const field of fields) {
        const value = data[field.name];
        if (field.type === 'group' && field.fields) {
            const nestedError = checkRequiredFields(field.fields, value || {});
            if (nestedError) return nestedError;
        } else if (field.type !== 'boolean' && (value === undefined || value === '')) {
            return `Field "${field.name}" is required.`;
        }
    }
    return null;
}

export function EntriesSheet({ isOpen, onOpenChange, form, entries, onAddEntry, onUpdateEntry, onDeleteEntry, encrypt, decrypt }: EntriesSheetProps) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<Record<string, any>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryData, setEditingEntryData] = useState<Record<string, any>>({});
  const [entryToDelete, setEntryToDelete] = useState<FormEntry | null>(null);

  const getInitialValue = (field: CustomFormField): any => {
    switch (field.type) {
      case 'boolean': return false;
      case 'group':
        if (!field.fields) return {};
        return field.fields.reduce((acc, f) => ({ ...acc, [f.name]: getInitialValue(f) }), {});
      default: return '';
    }
  };

  const handleAddEntry = () => {
    const error = checkRequiredFields(form.fields, newEntry);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error });
      return;
    }
    const encryptedData = encryptObject(newEntry, encrypt);
    onAddEntry({ formId: form.id, data: encryptedData });
    setNewEntry(form.fields.reduce((acc, f) => ({ ...acc, [f.name]: getInitialValue(f) }), {}));
    toast({ title: 'Success', description: 'New entry added.' });
  };
  
  const handleUpdateEntry = () => {
    if (!editingEntryId) return;
    const error = checkRequiredFields(form.fields, editingEntryData);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error });
      return;
    }
    const encryptedData = encryptObject(editingEntryData, encrypt);
    onUpdateEntry(editingEntryId, { data: encryptedData });
    setEditingEntryId(null);
    setEditingEntryData({});
    toast({ title: 'Success', description: 'Entry updated.' });
  }

  const handleDeleteEntry = () => {
    if (!entryToDelete) return;
    onDeleteEntry(entryToDelete.id);
    toast({ title: 'Success', description: 'Entry deleted.' });
    setEntryToDelete(null);
  }

  const startEditing = (entry: FormEntry) => {
    setEditingEntryId(entry.id);
    const decryptedData = decryptObject(entry.data, decrypt);
    // Convert boolean strings to booleans
    const processedData = JSON.parse(JSON.stringify(decryptedData), (key, value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    });
    setEditingEntryData(processedData);
  }
  
  const cancelEditing = () => {
      setEditingEntryId(null);
      setEditingEntryData({});
  }

  const renderInputField = (field: CustomFormField, value: any, onChange: (val: any) => void) => {
    if (field.type === 'group') {
        return (
             <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="flex w-max space-x-2 p-2">
                    {field.fields?.map(subField => (
                        <div key={subField.name} className='space-y-1 w-[150px]'>
                             <Label className="text-xs">{subField.name}</Label>
                            {renderInputField(subField, value?.[subField.name], (val) => onChange({ ...value, [subField.name]: val }))}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }

    switch (field.type) {
      case 'textarea':
        return <Textarea placeholder={`New ${field.name}`} value={value || ''} onChange={(e) => onChange(e.target.value)} rows={1} />;
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
                <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), 'PPP') : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={value ? new Date(value) : undefined} onSelect={(date) => onChange(date?.toISOString())} initialFocus />
            </PopoverContent>
          </Popover>
        );
      case 'time':
        return <Input type="time" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
      case 'datetime':
        return <Input type="datetime-local" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch id={`${field.name}-switch`} checked={value || false} onCheckedChange={onChange} />
            <Label htmlFor={`${field.name}-switch`}>{value ? 'Yes' : 'No'}</Label>
          </div>
        );
      case 'text':
      default:
        return <Input placeholder={`New ${field.name}`} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    }
  }

   const renderDisplayValue = (field: CustomFormField, value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';
    if(field.type === 'group') {
        const groupData = decryptObject(value, decrypt);
        return (
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4">
                    {field.fields?.map(subField => (
                        <div key={subField.name} className='text-xs'>
                            <strong className="font-semibold">{subField.name}:</strong>
                            <div className="text-muted-foreground mt-1">{renderDisplayValue(subField, groupData[subField.name] ?? 'N/A')}</div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }
    const decrypted = typeof value === 'string' ? decrypt(value) : String(value);
    switch (field.type) {
        case 'boolean':
            return decrypted === 'true' ? 'Yes' : 'No';
        case 'date':
            try { return format(new Date(decrypted), 'PPP'); } catch { return 'Invalid Date';}
        case 'datetime':
            try { return format(new Date(decrypted), 'Pp'); } catch { return 'Invalid Date';}
        default:
            return decrypted;
    }
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-full w-full md:w-3/4 lg:w-2/3 p-0 grid-rows-[auto_1fr_auto] max-h-[90svh]">
        <SheetHeader className="p-6">
          <SheetTitle>Entries for: {form.title}</SheetTitle>
          <SheetDescription>
            Manage the encrypted entries for this form. Data is decrypted for display only.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Table>
                    <TableHeader>
                    <TableRow>
                        {form.fields.map((field) => (
                        <TableHead key={field.name}>{field.name}</TableHead>
                        ))}
                        <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {/* Add New Row */}
                    <TableRow>
                        {form.fields.map((field) => (
                        <TableCell key={field.name}>
                            {renderInputField(field, newEntry[field.name] ?? getInitialValue(field), (val) => setNewEntry({ ...newEntry, [field.name]: val }))}
                        </TableCell>
                        ))}
                        <TableCell>
                        <Button onClick={handleAddEntry} size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                        </Button>
                        </TableCell>
                    </TableRow>
                    
                    {/* Existing Entries */}
                    {entries.map((entry) => (
                        <TableRow key={entry.id}>
                            {form.fields.map((field) => {
                                const isEditingThisRow = editingEntryId === entry.id;
                                return (
                                    <TableCell key={field.name} className='align-top'>
                                        {isEditingThisRow ? (
                                            renderInputField(field, editingEntryData[field.name], (val) => setEditingEntryData({...editingEntryData, [field.name]: val}))
                                        ) : (
                                            <div className='text-sm'>{renderDisplayValue(field, entry.data[field.name])}</div>
                                        )}
                                    </TableCell>
                                )
                            })}
                        <TableCell className="flex gap-1 align-top">
                            {editingEntryId === entry.id ? (
                                <>
                                    <Button onClick={handleUpdateEntry} size="icon" variant="ghost">
                                        <Save className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button onClick={cancelEditing} size="icon" variant="ghost">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button onClick={() => startEditing(entry)} size="icon" variant="ghost">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button onClick={() => setEntryToDelete(entry)} size="icon" variant="ghost">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </>
                            )}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                {entries.length === 0 && (
                    <p className="text-center text-muted-foreground mt-8">No entries for this form yet.</p>
                )}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this entry.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    

    



    