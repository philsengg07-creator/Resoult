
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, Save, X, Download, PlusCircle, FileText, Upload, DownloadCloud } from 'lucide-react';
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
import * as XLSX from 'xlsx';


const ENCRYPTION_KEY = 'adminonly@123';
const ENCRYPTION_PREFIX = 'U2FsdGVkX1';

// This function will be used to recursively decrypt object values
function decryptObject(obj: any, decryptFn: (ciphertext: string) => string): any {
    if (typeof obj !== 'object' || obj === null) {
        return decryptFn(obj);
    }
    
    if (Array.isArray(obj)) {
        // Check if it's an array of attachments
        if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && 'url' in obj[0] && 'name' in obj[0]) {
             return obj.map(item => ({
                ...item,
                name: decryptFn(item.name)
             }));
        }
        return obj.map(item => decryptObject(item, decryptFn));
    }
    
    const decryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            decryptedObj[key] = decryptObject(value, decryptFn);
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
        } else if (field.type !== 'boolean' && field.type !== 'attachments' && (value === undefined || value === '')) {
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


export function EntriesDialog({ isOpen, onOpenChange, form, entries, onAddEntry, onUpdateEntry, onDeleteEntry, encrypt, decrypt }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    form: CustomForm;
    entries: FormEntry[];
    onAddEntry: (entry: Omit<FormEntry, 'id'>) => void;
    onUpdateEntry: (id: string, entry: Partial<FormEntry>) => void;
    onDeleteEntry: (id: string) => void;
    encrypt: (text: string) => string;
    decrypt: (text: string) => string;
}) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<NewEntryState>({ data: {}, notes: '', attachments: [] });
  const [editingEntry, setEditingEntry] = useState<FormEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<FormEntry | null>(null);

  const getInitialValue = (field: CustomFormField): any => {
    switch (field.type) {
      case 'boolean': return false;
      case 'attachments': return [];
      case 'group':
        if (!field.fields) { return {}; }
        return field.fields.reduce((acc, f) => ({ ...acc, [f.name]: getInitialValue(f) }), {});
      default: return '';
    }
  };
  
  const encryptObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
        // For simple fields (non-objects/arrays), encrypt directly
        return typeof obj === 'string' ? encrypt(obj) : obj;
    }
    
    if (Array.isArray(obj)) {
       // Check if it's an array of attachments
        if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && 'url' in obj[0] && 'name' in obj[0]) {
             return obj.map(item => ({
                ...item,
                name: encrypt(item.name)
             }));
        }
        // For other arrays (e.g., in nested groups), recurse
        return obj.map(item => encryptObject(item));
    }
    
    const encryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            encryptedObj[key] = encryptObject(obj[key]);
        }
    }
    return encryptedObj;
  }

  const handleAddEntry = () => {
    const error = checkRequiredFields(form.fields, newEntry.data);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error });
      return;
    }
    
    onAddEntry({
        formId: form.id,
        data: encryptObject(sanitizeObjectKeys(newEntry.data)),
        notes: encrypt(newEntry.notes),
        attachments: encryptObject(newEntry.attachments),
    });
    
    setNewEntry({
        data: form.fields.reduce((acc, f) => ({ ...acc, [sanitizeKey(f.name)]: getInitialValue(f) }), {}),
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
        data: encryptObject(sanitizeObjectKeys(editingEntry.data)),
        notes: encrypt(editingEntry.notes),
        attachments: encryptObject(editingEntry.attachments),
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
    
    // Process booleans which are stored as strings
    const processedData = JSON.parse(JSON.stringify(decryptedData), (key, value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    });

    setEditingEntry({
        ...entry,
        data: processedData,
        notes: decrypt(entry.notes || ''),
        attachments: entry.attachments ? decryptObject(entry.attachments, decrypt) : [],
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
  
  const handleFieldAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        const newAttachment: Attachment = {
            name: file.name,
            url: loadEvent.target?.result as string,
        };

        if (isEditing) {
            setEditingEntry(prev => {
                if (!prev) return null;
                const currentAttachments = prev.data[fieldName] || [];
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        [fieldName]: [...currentAttachments, newAttachment],
                    }
                };
            });
        } else {
            setNewEntry(prev => {
                const currentAttachments = prev.data[fieldName] || [];
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        [fieldName]: [...currentAttachments, newAttachment],
                    }
                };
            });
        }
    };
    reader.readAsDataURL(file);
};

const removeFieldAttachment = (fieldName: string, index: number, isEditing: boolean) => {
    if (isEditing) {
        setEditingEntry(prev => {
            if (!prev) return null;
            const currentAttachments = prev.data[fieldName] || [];
            return {
                ...prev,
                data: {
                    ...prev.data,
                    [fieldName]: currentAttachments.filter((_: any, i: number) => i !== index),
                }
            };
        });
    } else {
        setNewEntry(prev => {
            const currentAttachments = prev.data[fieldName] || [];
            return {
                ...prev,
                data: {
                    ...prev.data,
                    [fieldName]: currentAttachments.filter((_: any, i: number) => i !== index),
                }
            };
        });
    }
};

  const renderInputField = (field: CustomFormField, value: any, onChange: (val: any) => void, isEditing: boolean) => {
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
                              {renderInputField(subField, value?.[sanitizedSubFieldName], (val) => onChange({ ...value, [sanitizedSubFieldName]: val }), isEditing)}
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
      case 'attachments': {
            const sanitizedFieldName = sanitizeKey(field.name);
            const attachments = (value as Attachment[]) || [];
            const uniqueId = `file-upload-${sanitizedFieldName}-${isEditing ? 'edit' : 'new'}`;
            return (
                <div className="space-y-2">
                    <Input id={uniqueId} type="file" className="hidden" onChange={(e) => handleFieldAttachmentUpload(e, sanitizedFieldName, isEditing)} />
                    <Button type="button" variant="outline" size="sm" className='w-full' onClick={() => document.getElementById(uniqueId)?.click()}>
                        <Plus className="mr-2 h-4 w-4" /> Add File
                    </Button>
                    {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-1 border rounded-md">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate flex-grow">{att.name}</span>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFieldAttachment(sanitizedFieldName, i, isEditing)}>
                                <X className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            )
        }
      case 'text':
      default:
        return <Input placeholder={`New ${field.name}`} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    }
  }

   const renderDisplayValue = (field: CustomFormField, value: any): React.ReactNode => {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">N/A</span>;
    
    if(field.type === 'group') {
        const groupData = decryptObject(value, decrypt);
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

    if (field.type === 'attachments') {
        const attachments = decryptObject(value, decrypt) as Attachment[];
        if (!attachments || attachments.length === 0) return <span className="text-muted-foreground">N/A</span>;
        return (
            <div className="space-y-1">
                {attachments.map((att, i) => (
                    <Button key={i} variant="outline" size="sm" className="h-8 w-full justify-start" asChild>
                        <a href={att.url} download={att.name}>
                            <Download className="mr-2 h-3 w-3"/>
                            <span className="truncate">{att.name}</span>
                        </a>
                    </Button>
                ))}
            </div>
        )
    }
    
    const decryptedValue = decrypt(value);

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

  const handleExport = () => {
    if (entries.length === 0) {
      toast({ title: 'No Data', description: 'There are no entries to export.' });
      return;
    }
    const dataToExport = entries.map(entry => {
      const decryptedData = decryptObject(entry.data, decrypt);
      const decryptedNotes = decrypt(entry.notes || '');
      const flatData: Record<string, any> = {};

      form.fields.forEach(field => {
        const key = sanitizeKey(field.name);
        const value = decryptedData[key];
        if (field.type === 'group' || field.type === 'attachments' || Array.isArray(value)) {
          flatData[field.name] = JSON.stringify(value);
        } else {
          flatData[field.name] = value;
        }
      });

      flatData['notes'] = decryptedNotes;
      const attachmentNames = (decryptObject(entry.attachments || [], decrypt) as Attachment[]).map(a => a.name).join(', ');
      flatData['entry_attachments'] = attachmentNames;
      
      return flatData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entries');
    XLSX.writeFile(workbook, `${form.title.replace(/ /g, '_')}_entries.xlsx`);
    toast({ title: 'Success', description: 'Entries exported to Excel.' });
  };
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (json.length === 0) {
          toast({ variant: 'destructive', title: 'Import Error', description: 'Excel file is empty.' });
          return;
        }

        const requiredHeaders = form.fields.map(f => f.name);
        const fileHeaders = Object.keys(json[0]);
        const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

        if (missingHeaders.length > 0) {
            toast({ variant: 'destructive', title: 'Import Error', description: `Missing required columns: ${missingHeaders.join(', ')}` });
            return;
        }

        json.forEach(row => {
          const entryData: Record<string, any> = {};
          form.fields.forEach(field => {
            let value = row[field.name];
            if (field.type === 'group' || field.type === 'attachments' || Array.isArray(value)) {
                try { value = JSON.parse(value); } catch {}
            }
            entryData[field.name] = value;
          });

          const newImportedEntry: Omit<FormEntry, 'id'> = {
            formId: form.id,
            data: encryptObject(sanitizeObjectKeys(entryData)),
            notes: row['notes'] ? encrypt(row['notes']) : '',
            attachments: [], // We don't import attachments from excel
          };
          onAddEntry(newImportedEntry);
        });

        toast({ title: 'Import Successful', description: `${json.length} entries have been imported.` });
      } catch (error) {
        console.error('Excel import error:', error);
        toast({ variant: 'destructive', title: 'Import Error', description: 'Failed to read or process the Excel file.' });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset file input
  };


  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Entries for: {form.title}</DialogTitle>
              <DialogDescription>
                Manage entries for this form.
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <input type="file" id="import-form-excel" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('import-form-excel')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <DownloadCloud className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
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
                             {renderInputField(field, newEntry.data[sanitizeKey(field.name)] ?? getInitialValue(field), (val) => setNewEntry({ ...newEntry, data: { ...newEntry.data, [sanitizeKey(field.name)]: val}}), false)}
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
                                            renderInputField(field, editingEntry!.data[sanitizedFieldName], (val) => setEditingEntry({...editingEntry!, data: {...editingEntry!.data, [sanitizedFieldName]: val}}), true)
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
                                                <span className="truncate flex-grow">{decrypt(att.name)}</span>
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
