
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { type CustomForm, type FormEntry } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

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

export function EntriesSheet({ isOpen, onOpenChange, form, entries, onAddEntry, onUpdateEntry, onDeleteEntry, encrypt, decrypt }: EntriesSheetProps) {
  const { toast } = useToast();
  const [newEntry, setNewEntry] = useState<Record<string, string>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryData, setEditingEntryData] = useState<Record<string, string>>({});

  const handleAddEntry = () => {
    if (Object.values(newEntry).some(v => !v)) {
      toast({ variant: 'destructive', title: 'Error', description: 'All fields are required for a new entry.' });
      return;
    }
    const encryptedData = Object.fromEntries(
      Object.entries(newEntry).map(([key, value]) => [key, encrypt(value)])
    );
    onAddEntry({ formId: form.id, data: encryptedData });
    setNewEntry({});
    toast({ title: 'Success', description: 'New entry added.' });
  };
  
  const handleUpdateEntry = () => {
    if (!editingEntryId) return;
     if (Object.values(editingEntryData).some(v => !v)) {
      toast({ variant: 'destructive', title: 'Error', description: 'All fields are required.' });
      return;
    }
    const encryptedData = Object.fromEntries(
        Object.entries(editingEntryData).map(([key, value]) => [key, encrypt(value)])
    );
    onUpdateEntry(editingEntryId, { data: encryptedData });
    setEditingEntryId(null);
    setEditingEntryData({});
    toast({ title: 'Success', description: 'Entry updated.' });
  }

  const startEditing = (entry: FormEntry) => {
    setEditingEntryId(entry.id);
    const decryptedData = Object.fromEntries(
        Object.entries(entry.data).map(([key, value]) => [key, decrypt(value)])
    );
    setEditingEntryData(decryptedData);
  }
  
  const cancelEditing = () => {
      setEditingEntryId(null);
      setEditingEntryData({});
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-full w-full md:w-3/4 lg:w-2/3 p-0">
        <SheetHeader className="p-6">
          <SheetTitle>Entries for: {form.title}</SheetTitle>
          <SheetDescription>
            Manage the encrypted entries for this form. Data is decrypted for display only.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-auto p-6">
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
                    {field.type === 'textarea' ? (
                      <Textarea
                        placeholder={`New ${field.name}`}
                        value={newEntry[field.name] || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, [field.name]: e.target.value })}
                        rows={1}
                      />
                    ) : (
                      <Input
                        placeholder={`New ${field.name}`}
                        value={newEntry[field.name] || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, [field.name]: e.target.value })}
                      />
                    )}
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
                        const cellValue = isEditingThisRow 
                            ? (editingEntryData[field.name] || '')
                            : (entry.data[field.name] ? decrypt(entry.data[field.name]) : 'N/A');

                        return (
                             <TableCell key={field.name}>
                                {isEditingThisRow ? (
                                     field.type === 'textarea' ? (
                                        <Textarea
                                            value={cellValue}
                                            onChange={(e) => setEditingEntryData({...editingEntryData, [field.name]: e.target.value})}
                                            rows={1}
                                        />
                                    ) : (
                                        <Input
                                            value={cellValue}
                                            onChange={(e) => setEditingEntryData({...editingEntryData, [field.name]: e.target.value})}
                                        />
                                    )
                                ) : (
                                    <span className='text-sm'>{cellValue}</span>
                                )}
                            </TableCell>
                        )
                    })}
                  <TableCell className="flex gap-1">
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
                            <Button onClick={() => onDeleteEntry(entry.id)} size="icon" variant="ghost">
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
      </SheetContent>
    </Sheet>
  );
}

