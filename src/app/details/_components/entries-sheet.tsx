
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
    const encryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (key === 'attachment' || key === 'attachmentName') { // Do not encrypt attachment data
                encryptedObj[key] = value;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
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
    const decryptedObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (key === 'attachment' || key === 'attachmentName') { // Do not decrypt attachment data
                decryptedObj[key] = value;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
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
        const fieldData = data[field.name];
        const value = fieldData?.value;
        if (field.type === 'group' && field.fields) {
            const nestedError = checkRequiredFields(field.fields, value || {});
            if (nestedError) return nestedError;
        } else if (field.type !== 'boolean' && (value === undefined || value === '')) {
            return `Field "${field.name}" is required.`;
        }
    }
    return null;
}

export function EntriesDialog({ isOpen, onOpenChange, form, entries, onAddEntry, onUpdateEntry, onDeleteEntry, encrypt, decrypt }: EntriesDialogProps) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<Record<string, any>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryData, setEditingEntryData] = useState<Record<string, any>>({});
  const [entryToDelete, setEntryToDelete] = useState<FormEntry | null>(null);

  const getInitialValue = (field: CustomFormField): any => {
    let baseValue;
    switch (field.type) {
      case 'boolean': baseValue = false; break;
      case 'group':
        if (!field.fields) { baseValue = {}; break; }
        baseValue = field.fields.reduce((acc, f) => ({ ...acc, [f.name]: getInitialValue(f) }), {});
        break;
      default: baseValue = '';
    }
    // For non-group fields, wrap in the new structure
    if (field.type !== 'group') {
        return { value: baseValue, notes: '', attachment: '', attachmentName: '' };
    }
    return baseValue; // Groups handle nesting recursively
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: any) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        onChange({
          attachment: loadEvent.target?.result as string,
          attachmentName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };


  const renderInputField = (field: CustomFormField, value: any, onChange: (val: any) => void) => {
    const handleValueChange = (newValue: any) => {
      onChange({...(value || {}), value: newValue});
    };
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({...(value || {}), notes: e.target.value});
    };
    const handleAttachmentChange = (attachmentData: { attachment: string, attachmentName: string}) => {
      onChange({... (value || {}), ...attachmentData});
    };
     const removeAttachment = () => {
      onChange({... (value || {}), attachment: '', attachmentName: ''});
    };

    if (field.type === 'group') {
        return (
             <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="flex w-max space-x-2 p-2">
                    {field.fields?.map(subField => (
                        <div key={subField.name} className='space-y-1 w-[200px]'>
                             <Label className="text-xs">{subField.name}</Label>
                            {renderInputField(subField, value?.[subField.name], (val) => onChange({ ...value, [subField.name]: val }))}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }

    const fieldValue = value?.value;
    const fieldNotes = value?.notes;
    const fieldAttachmentName = value?.attachmentName;

    let inputComponent;
    switch (field.type) {
      case 'textarea':
        inputComponent = <Textarea placeholder={`New ${field.name}`} value={fieldValue || ''} onChange={(e) => handleValueChange(e.target.value)} rows={1} />;
        break;
      case 'date':
        inputComponent = (
          <Popover>
            <PopoverTrigger asChild>
                <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !fieldValue && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fieldValue ? format(new Date(fieldValue), 'PPP') : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={fieldValue ? new Date(fieldValue) : undefined} onSelect={(date) => handleValueChange(date?.toISOString())} initialFocus />
            </PopoverContent>
          </Popover>
        );
        break;
      case 'time':
        inputComponent = <Input type="time" value={fieldValue || ''} onChange={(e) => handleValueChange(e.target.value)} />;
        break;
      case 'datetime':
        inputComponent = <Input type="datetime-local" value={fieldValue || ''} onChange={(e) => handleValueChange(e.target.value)} />;
        break;
      case 'boolean':
        inputComponent = (
          <div className="flex items-center space-x-2">
            <Switch id={`${field.name}-switch`} checked={fieldValue || false} onCheckedChange={handleValueChange} />
            <Label htmlFor={`${field.name}-switch`}>{fieldValue ? 'Yes' : 'No'}</Label>
          </div>
        );
        break;
      case 'text':
      default:
        inputComponent = <Input placeholder={`New ${field.name}`} value={fieldValue || ''} onChange={(e) => handleValueChange(e.target.value)} />;
        break;
    }

    return (
        <div className="space-y-2">
            {inputComponent}
            <Textarea value={fieldNotes || ''} onChange={handleNotesChange} placeholder="Notes..." className="text-xs h-16"/>
             <div className="flex items-center gap-2">
                <Label htmlFor={`file-${field.name}`} className="flex-grow">
                    <Button type="button" variant="outline" size="sm" asChild>
                        <span className="w-full flex items-center cursor-pointer">
                            <Paperclip className="mr-2 h-4 w-4" />
                             <span className='truncate flex-1 text-left'>{fieldAttachmentName || "Attach File"}</span>
                        </span>
                    </Button>
                </Label>
                <Input id={`file-${field.name}`} type="file" className="hidden" onChange={(e) => handleFileUpload(e, handleAttachmentChange)} />
                {fieldAttachmentName && (
                     <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={removeAttachment}>
                        <X className="h-4 w-4 text-destructive" />
                    </Button>
                )}
            </div>
        </div>
    )
  }

   const renderDisplayValue = (field: CustomFormField, value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';
    
    if(field.type === 'group') {
        const groupData = decryptObject(value, decrypt);
        return (
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4">
                    {field.fields?.map(subField => (
                        <div key={subField.name} className='text-xs w-[200px]'>
                            <strong className="font-semibold">{subField.name}:</strong>
                            <div className="text-muted-foreground mt-1">{renderDisplayValue(subField, groupData[subField.name] ?? 'N/A')}</div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }

    const decryptedData = decryptObject(value, decrypt);
    const mainValue = decryptedData.value;
    const notes = decryptedData.notes;
    const attachment = decryptedData.attachment;
    const attachmentName = decryptedData.attachmentName;
    
    let displayValue;
    switch (field.type) {
        case 'boolean':
            displayValue = mainValue === 'true' ? 'Yes' : 'No'; break;
        case 'date':
            try { displayValue = format(new Date(mainValue), 'PPP'); } catch { displayValue = 'Invalid Date';} break;
        case 'datetime':
            try { displayValue = format(new Date(mainValue), 'Pp'); } catch { displayValue = 'Invalid Date';} break;
        default:
            displayValue = mainValue; break;
    }

    return (
        <div className="space-y-2">
            <div className="font-medium">{displayValue || 'N/A'}</div>
            {notes && <p className="text-xs text-muted-foreground border-l-2 pl-2 italic">{notes}</p>}
            {attachment && attachmentName && (
                <Button variant="outline" size="sm" className="h-7" asChild>
                    <a href={attachment} download={attachmentName}>
                        <Download className="mr-2 h-3 w-3"/>
                        {attachmentName}
                    </a>
                </Button>
            )}
        </div>
    );
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
                    <Table>
                        <TableHeader>
                        <TableRow>
                            {form.fields.map((field) => (
                            <TableHead key={field.name}>{field.name}</TableHead>
                            ))}
                            <TableHead className="w-[120px] sticky right-0 bg-background">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {/* Add New Row */}
                        <TableRow>
                            {form.fields.map((field) => (
                            <TableCell key={field.name} className="align-top">
                                {renderInputField(field, newEntry[field.name] ?? getInitialValue(field), (val) => setNewEntry({ ...newEntry, [field.name]: val }))}
                            </TableCell>
                            ))}
                            <TableCell className="sticky right-0 bg-background align-top pt-6">
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
                            <TableCell className="flex gap-1 align-top sticky right-0 bg-background pt-6">
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
