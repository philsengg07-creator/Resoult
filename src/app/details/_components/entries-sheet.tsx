
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, Save, X, Paperclip, Download, PlusCircle, FileText } from 'lucide-react';
import { type CustomForm, type FormEntry, type CustomFormField, type Attachment } from '@/types';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Image from 'next/image';

const ENCRYPTION_KEY = 'adminonly@123';
const ENCRYPTION_PREFIX = 'U2FsdGVkX1';

const decrypt = (ciphertext: string): string => {
    if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;

    try {
        if (ciphertext.startsWith(ENCRYPTION_PREFIX)) {
            const CryptoJS = require('crypto-js');
            const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
            const result = bytes.toString(CryptoJS.enc.Utf8);
            return result || ciphertext; // Return original if decryption results in empty string
        }
    } catch (e) {
        // Fails silently and returns original text
    }
    return ciphertext;
};

// This function will be used to recursively decrypt object values
function decryptObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return decrypt(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => decryptObject(item));
    }
    
    // special handling for attachments array
    if (obj.url && obj.name) { // Heuristic for attachment object
        return {
            url: obj.url, // Don't decrypt URL
            name: decrypt(obj.name)
        };
    }

    const decryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            decryptedObj[key] = decryptObject(value);
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
    attachments: Attachment[];
};

// Sanitize keys for Firebase by replacing invalid characters.
const sanitizeKey = (key: string) => key.replace(/[.#$[\]/]/g, '-');

function sanitizeObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectKeys(item));
  }

  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = sanitizeKey(key);
      newObj[newKey] = sanitizeObjectKeys(obj[key]);
    }
  }
  return newObj;
}


export function EntriesDialog({ isOpen, onOpenChange, form, entries, onAddEntry, onUpdateEntry, onDeleteEntry }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    form: CustomForm;
    entries: FormEntry[];
    onAddEntry: (entry: Omit<FormEntry, 'id'>) => void;
    onUpdateEntry: (id: string, entry: Partial<FormEntry>) => void;
    onDeleteEntry: (id: string) => void;
}) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<NewEntryState>({ data: {}, notes: '', attachments: [] });
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
        data: sanitizeObjectKeys(newEntry.data),
        notes: newEntry.notes,
        attachments: newEntry.attachments,
    });
    
    setNewEntry({
        data: form.fields.reduce((acc, f) => ({ ...acc, [f.name]: getInitialValue(f) }), {}),
        notes: '',
        attachments: [],
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
        data: sanitizeObjectKeys(editingEntry.data),
        notes: editingEntry.notes,
        attachments: editingEntry.attachments,
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
    const decryptedData = decryptObject(entry.data);
    const processedData = JSON.parse(JSON.stringify(decryptedData), (key, value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    });

    setEditingEntry({
        ...entry,
        data: processedData,
        notes: decrypt(entry.notes || ''),
        attachments: entry.attachments ? decryptObject(entry.attachments) : [],
    });
  }
  
  const cancelEditing = () => {
      setEditingEntry(null);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const newAttachment: Attachment = {
            name: file.name,
            url: loadEvent.target?.result as string,
        }
        if (isEditing) {
            setEditingEntry(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), newAttachment] } : null);
        } else {
            setNewEntry(prev => ({...prev, attachments: [...prev.attachments, newAttachment]}));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number, isEditing: boolean) => {
    if(isEditing) {
        setEditingEntry(prev => prev ? {...prev, attachments: prev.attachments?.filter((_, i) => i !== index)} : null)
    } else {
        setNewEntry(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== index)}));
    }
  };

  const renderInputField = (field: CustomFormField, value: any, onChange: (val: any) => void) => {
    if (field.type === 'group') {
        const sanitizedFieldName = sanitizeKey(field.name);
        return (
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <div className="flex w-max space-x-2 p-2 bg-muted/50">
                  {field.fields?.map(subField => {
                      const sanitizedSubFieldName = sanitizeKey(subField.name);
                      return (
                          <div key={sanitizedSubFieldName} className='space-y-1 w-[200px]'>
                              <Label className="text-xs">{subField.name}</Label>
                              {renderInputField(subField, value?.[sanitizedSubFieldName], (val) => onChange({ ...value, [sanitizedSubFieldName]: val }))}
                          </div>
                      )
                  })}
              </div>
               <ScrollBar orientation="horizontal" />
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
    const decryptedValue = decrypt(value);
    if (decryptedValue === null || decryptedValue === undefined || decryptedValue === '') return <span className="text-muted-foreground">N/A</span>;
    
    const sanitizedFieldName = sanitizeKey(field.name);
    if(field.type === 'group') {
        const groupData = decryptObject(value);
        return (
             <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="flex w-max space-x-4 p-2 text-xs">
                    {field.fields?.map(subField => {
                        const sanitizedSubFieldName = sanitizeKey(subField.name);
                        return (
                        <div key={sanitizedSubFieldName} className='w-[200px]'>
                            <strong className="font-semibold">{subField.name}:</strong>
                            <div className="text-muted-foreground mt-1 whitespace-normal break-words">{renderDisplayValue(subField, groupData[sanitizedSubFieldName] ?? 'N/A')}</div>
                        </div>
                    )})}
                </div>
                 <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
            return String(decryptedValue);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Entries for: {form.title}</DialogTitle>
          <DialogDescription>
            Manage entries for this form.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 w-full overflow-hidden">
            <div className="p-6">
                <Table className="w-full table-fixed">
                    <TableHeader>
                    <TableRow>
                        {form.fields.map((field) => (
                        <TableHead key={field.name} className="w-[250px]">{field.name}</TableHead>
                        ))}
                        <TableHead className="w-[250px]">Notes</TableHead>
                        <TableHead className="w-[250px]">Attachments</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {/* Add New Row */}
                    <TableRow>
                        {form.fields.map((field) => (
                        <TableCell key={field.name} className="align-top p-2">
                             {renderInputField(field, newEntry.data[sanitizeKey(field.name)] ?? getInitialValue(field), (val) => setNewEntry({ ...newEntry, data: { ...newEntry.data, [sanitizeKey(field.name)]: val}}))}
                        </TableCell>
                        ))}
                        <TableCell className="align-top p-2">
                            <Textarea value={newEntry.notes} onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})} placeholder="Notes..."/>
                        </TableCell>
                        <TableCell className="align-top p-2 space-y-2">
                             <Input id={`file-new`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
                             <Button type="button" variant="outline" size="sm" className='w-full' onClick={() => document.getElementById('file-new')?.click()}>
                                <Plus className="mr-2 h-4 w-4" /> Add Attachment
                            </Button>
                            {newEntry.attachments.map((att, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm p-1 border rounded-md">
                                    <FileText className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate flex-grow">{att.name}</span>
                                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAttachment(i, false)}>
                                        <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </TableCell>
                        <TableCell className="align-top text-right p-2 pt-4">
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
                                const sanitizedFieldName = sanitizeKey(field.name);

                                return (
                                    <TableCell key={sanitizedFieldName} className='align-top p-2'>
                                        {isEditing ? (
                                            renderInputField(field, editingEntry!.data[sanitizedFieldName], (val) => setEditingEntry({...editingEntry!, data: {...editingEntry!.data, [sanitizedFieldName]: val}}))
                                        ) : (
                                            <div className='text-sm break-words whitespace-normal'>{renderDisplayValue(field, entry.data[sanitizedFieldName])}</div>
                                        )}
                                    </TableCell>
                                )
                            })}
                            <TableCell className='align-top p-2'>
                                {editingEntry?.id === entry.id ? (
                                    <Textarea value={editingEntry.notes} onChange={(e) => setEditingEntry({...editingEntry, notes: e.target.value})} placeholder="Notes..."/>
                                ) : (
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{decrypt(entry.notes || '') || <span className="text-muted-foreground">N/A</span>}</p>
                                )}
                            </TableCell>
                            <TableCell className='align-top p-2 space-y-2'>
                                {editingEntry?.id === entry.id ? (
                                    <>
                                        <Input id={`file-edit-${entry.id}`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                                        <Button type="button" variant="outline" size="sm" className='w-full' onClick={() => document.getElementById(`file-edit-${entry.id}`)?.click()}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Attachment
                                        </Button>
                                        {editingEntry.attachments?.map((att, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm p-1 border rounded-md">
                                                <FileText className="h-4 w-4 flex-shrink-0" />
                                                <span className="truncate flex-grow">{att.name}</span>
                                                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAttachment(i, true)}>
                                                    <X className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    entry.attachments?.map((att, i) => (
                                        <Button key={i} variant="outline" size="sm" className="h-8 w-full justify-start" asChild>
                                            <a href={att.url} download={decrypt(att.name)}>
                                                <Download className="mr-2 h-3 w-3"/>
                                                <span className="truncate">{decrypt(att.name)}</span>
                                            </a>
                                        </Button>
                                    ))
                                )}
                                {(!entry.attachments || entry.attachments.length === 0) && editingEntry?.id !== entry.id && <span className="text-xs text-muted-foreground">N/A</span>}
                            </TableCell>

                        <TableCell className="flex gap-1 align-top text-right p-2 pt-4">
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
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
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
