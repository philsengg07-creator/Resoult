
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Edit, Save, X, Paperclip, Download } from 'lucide-react';
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


interface EntriesDialogProps {
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
      try { return encryptFn(String(obj)); } catch { return obj; }
    }
    if (Array.isArray(obj)) {
        return obj.map(item => encryptObject(item, encryptFn));
    }
    const encryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                encryptedObj[key] = encryptObject(value, encryptFn);
            } else if (value) {
                encryptedObj[key] = encryptFn(String(value));
            } else {
                encryptedObj[key] = value;
            }
        }
    }
    return encryptedObj;
}

function decryptObject(obj: any, decryptFn: (text: string) => string): any {
    if (typeof obj !== 'object' || obj === null) {
        try { return decryptFn(obj); } catch { return obj; }
    }
    if (Array.isArray(obj)) {
        return obj.map(item => decryptObject(item, decryptFn));
    }
    const decryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
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

type NewEntryState = {
    data: Record<string, any>;
    notes: string;
    attachment: string;
    attachmentName: string;
};

export function EntriesDialog({ isOpen, onOpenChange, form, entries, onAddEntry, onUpdateEntry, onDeleteEntry, encrypt, decrypt }: EntriesDialogProps) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<NewEntryState>({ data: {}, notes: '', attachment: '', attachmentName: '' });
  const [editingEntry, setEditingEntry] = useState<FormEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<FormEntry | null>(null);

  const getInitialValue = (field: CustomFormField): any => {
    switch (field.type) {
      case 'boolean': return false;
      case 'group':
        if (!field.fields) { return {}; }
        return field.fields.reduce((acc, f) => ({ ...acc, [f.name]: getInitialValue(f) }), {});
      default: return '';
    }
  };

  const handleAddEntry = () => {
    const error = checkRequiredFields(form.fields, newEntry.data);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error });
      return;
    }
    onAddEntry({
        formId: form.id,
        data: encryptObject(newEntry.data, encrypt),
        notes: newEntry.notes ? encrypt(newEntry.notes) : '',
        attachment: newEntry.attachment, // Do not encrypt attachment data URI
        attachmentName: newEntry.attachmentName ? encrypt(newEntry.attachmentName) : '',
    });
    setNewEntry({
        data: form.fields.reduce((acc, f) => ({ ...acc, [f.name]: getInitialValue(f) }), {}),
        notes: '',
        attachment: '',
        attachmentName: ''
    });
    toast({ title: 'Success', description: 'New entry added.' });
  };
  
  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    const error = checkRequiredFields(form.fields, editingEntry.data);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error });
      return;
    }
    onUpdateEntry(editingEntry.id, {
        data: encryptObject(editingEntry.data, encrypt),
        notes: editingEntry.notes ? encrypt(editingEntry.notes) : '',
        attachment: editingEntry.attachment,
        attachmentName: editingEntry.attachmentName ? encrypt(editingEntry.attachmentName) : '',
    });
    setEditingEntry(null);
    toast({ title: 'Success', description: 'Entry updated.' });
  }

  const handleDeleteEntry = () => {
    if (!entryToDelete) return;
    onDeleteEntry(entryToDelete.id);
    toast({ title: 'Success', description: 'Entry deleted.' });
    setEntryToDelete(null);
  }

  const startEditing = (entry: FormEntry) => {
    const decryptedData = decryptObject(entry.data, decrypt);
    const processedData = JSON.parse(JSON.stringify(decryptedData), (key, value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    });

    setEditingEntry({
        ...entry,
        data: processedData,
        notes: entry.notes ? decrypt(entry.notes) : '',
        attachmentName: entry.attachmentName ? decrypt(entry.attachmentName) : '',
    });
  }
  
  const cancelEditing = () => {
      setEditingEntry(null);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, onFileChange: (data: { attachment: string, attachmentName: string }) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        onFileChange({
          attachment: loadEvent.target?.result as string,
          attachmentName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderInputField = (field: CustomFormField, value: any, onChange: (val: any) => void) => {
    if (field.type === 'group') {
        return (
            <div className="flex w-max space-x-2 p-2 border rounded-md bg-muted/50">
                {field.fields?.map(subField => (
                    <div key={subField.name} className='space-y-1 w-[200px]'>
                        <Label className="text-xs">{subField.name}</Label>
                        {renderInputField(subField, value?.[subField.name], (val) => onChange({ ...value, [subField.name]: val }))}
                    </div>
                ))}
            </div>
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
          <div className="flex items-center space-x-2 h-10">
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
    const decryptedValue = decryptObject(value, decrypt);
    if (decryptedValue === null || decryptedValue === undefined || decryptedValue === '') return <span className="text-muted-foreground">N/A</span>;
    
    if(field.type === 'group') {
        return (
            <div className="flex w-max space-x-4 p-1">
                {field.fields?.map(subField => (
                    <div key={subField.name} className='text-xs w-[200px]'>
                        <strong className="font-semibold">{subField.name}:</strong>
                        <div className="text-muted-foreground mt-1">{renderDisplayValue(subField, decryptedValue[subField.name] ?? 'N/A')}</div>
                    </div>
                ))}
            </div>
        )
    }

    switch (field.type) {
        case 'boolean':
            return decryptedValue === 'true' ? 'Yes' : 'No';
        case 'date':
            try { return format(new Date(decryptedValue), 'PPP'); } catch { return 'Invalid Date';}
        case 'datetime':
            try { return format(new Date(decryptedValue), 'Pp'); } catch { return 'Invalid Date';}
        default:
            return decryptedValue;
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Entries for: {form.title}</DialogTitle>
          <DialogDescription>
            Manage the encrypted entries for this form. Data is decrypted for display only.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
             <ScrollArea className="h-full w-full">
                <div className="p-6">
                    <div className='w-full overflow-x-auto'>
                        <Table className='table-fixed w-full'>
                            <TableHeader>
                            <TableRow>
                                {form.fields.map((field) => (
                                <TableHead key={field.name} className="min-w-[250px]">{field.name}</TableHead>
                                ))}
                                <TableHead className="min-w-[250px]">Notes</TableHead>
                                <TableHead className="min-w-[250px]">Attachment</TableHead>
                                <TableHead className="w-[120px] sticky right-0 bg-background">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {/* Add New Row */}
                            <TableRow>
                                {form.fields.map((field) => (
                                <TableCell key={field.name} className="align-top">
                                    {renderInputField(field, newEntry.data[field.name] ?? getInitialValue(field), (val) => setNewEntry({ ...newEntry, data: { ...newEntry.data, [field.name]: val}}))}
                                </TableCell>
                                ))}
                                <TableCell className="align-top">
                                    <Textarea value={newEntry.notes} onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})} placeholder="Notes..."/>
                                </TableCell>
                                <TableCell className="align-top">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`file-new`} className="flex-grow">
                                            <Button type="button" variant="outline" size="sm" asChild>
                                                <span className="w-full flex items-center cursor-pointer">
                                                    <Paperclip className="mr-2 h-4 w-4" />
                                                    <span className='truncate flex-1 text-left'>{newEntry.attachmentName || "Attach File"}</span>
                                                </span>
                                            </Button>
                                        </Label>
                                        <Input id={`file-new`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, (fileData) => setNewEntry({...newEntry, ...fileData}))} />
                                        {newEntry.attachmentName && (
                                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setNewEntry({...newEntry, attachment: '', attachmentName: ''})}>
                                                <X className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="sticky right-0 bg-background align-top pt-2.5">
                                    <Button onClick={handleAddEntry} size="sm">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                                    </Button>
                                </TableCell>
                            </TableRow>
                            
                            {/* Existing Entries */}
                            {entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    {form.fields.map((field) => {
                                        const isEditing = editingEntry?.id === entry.id;
                                        return (
                                            <TableCell key={field.name} className='align-top'>
                                                {isEditing ? (
                                                    renderInputField(field, editingEntry!.data[field.name], (val) => setEditingEntry({...editingEntry!, data: {...editingEntry!.data, [field.name]: val}}))
                                                ) : (
                                                    <div className='text-sm break-words'>{renderDisplayValue(field, entry.data[field.name])}</div>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                    <TableCell className='align-top'>
                                        {editingEntry?.id === entry.id ? (
                                            <Textarea value={editingEntry.notes} onChange={(e) => setEditingEntry({...editingEntry, notes: e.target.value})} placeholder="Notes..."/>
                                        ) : (
                                            <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{entry.notes ? decrypt(entry.notes) : <span className="text-muted-foreground">N/A</span>}</p>
                                        )}
                                    </TableCell>
                                    <TableCell className='align-top'>
                                        {editingEntry?.id === entry.id ? (
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`file-${entry.id}`} className="flex-grow">
                                                    <Button type="button" variant="outline" size="sm" asChild>
                                                        <span className="w-full flex items-center cursor-pointer">
                                                            <Paperclip className="mr-2 h-4 w-4" />
                                                            <span className='truncate flex-1 text-left'>{editingEntry.attachmentName || "Attach File"}</span>
                                                        </span>
                                                    </Button>
                                                </Label>
                                                <Input id={`file-${entry.id}`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, (fileData) => setEditingEntry({...editingEntry, ...fileData}))} />
                                                {editingEntry.attachmentName && (
                                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingEntry({...editingEntry, attachment: '', attachmentName: ''})}>
                                                        <X className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            entry.attachment && entry.attachmentName ? (
                                                <Button variant="outline" size="sm" className="h-8" asChild>
                                                    <a href={entry.attachment} download={decrypt(entry.attachmentName)}>
                                                        <Download className="mr-2 h-3 w-3"/>
                                                        <span className="truncate">{decrypt(entry.attachmentName)}</span>
                                                    </a>
                                                </Button>
                                            ) : ( <span className="text-xs text-muted-foreground">N/A</span>)
                                        )}
                                    </TableCell>

                                <TableCell className="flex gap-1 align-top sticky right-0 bg-background pt-2.5">
                                    {editingEntry?.id === entry.id ? (
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
                    </div>
                    {entries.length === 0 && (
                        <p className="text-center text-muted-foreground p-8">No entries for this form yet.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
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

    