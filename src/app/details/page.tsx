
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type CustomForm, type FormEntry, type SheetDefinition, type SheetCell, CustomFormFieldTypeSchema, type CustomFormField } from '@/types';
import * as crypto from 'crypto-js';
import { PlusCircle, Edit, Trash2, Upload } from 'lucide-react';
import { CustomFormDialog } from './_components/custom-form-dialog';
import { EntriesDialog } from './_components/entries-sheet';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SheetCreateDialog } from './_components/sheet-create-dialog';
import { SheetViewDialog } from './_components/sheet-view-dialog';
import * as XLSX from 'xlsx';

const ENCRYPTION_KEY = 'adminonly@123';
const ENCRYPTION_PREFIX = 'U2FsdGVkX1';

export default function DetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  // Forms State
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [isEntriesSheetOpen, setIsEntriesSheetOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<CustomForm | null>(null);
  
  // Sheets State
  const [editingSheet, setEditingSheet] = useState<SheetDefinition | null>(null);
  const [isSheetCreateDialogOpen, setIsSheetCreateDialogOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<SheetDefinition | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SheetDefinition | null>(null);
  const [isSheetViewOpen, setIsSheetViewOpen] = useState(false);


  const { data: customForms, add: addForm, update: updateForm, removeById: deleteForm, loading: formsLoading } = useDatabaseList<CustomForm>('customForms');
  const { data: formEntries, add: addEntry, update: updateEntry, removeById: deleteEntry, loading: entriesLoading } = useDatabaseList<FormEntry>('formEntries');
  const { data: sheets, add: addSheet, update: updateSheet, removeById: deleteSheet, loading: sheetsLoading } = useDatabaseList<SheetDefinition>('sheets');
  const { data: sheetCells, add: addCell, update: updateCell, removeById: deleteCell, loading: cellsLoading } = useDatabaseList<SheetCell>('sheetCells');


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !authLoading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, isClient, router, authLoading]);

  const encrypt = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    return crypto.AES.encrypt(text, ENCRYPTION_KEY).toString();
  };

  const decrypt = (ciphertext: string): string => {
    if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith(ENCRYPTION_PREFIX)) {
      return ciphertext;
    }
    try {
        const bytes = crypto.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        const result = bytes.toString(crypto.enc.Utf8);
        return result || ciphertext;
    } catch (e) {
        return ciphertext;
    }
  };
  
  // --- Form Logic ---
  const handleFormSubmit = (values: Omit<CustomForm, 'id'>) => {
    if (editingForm) {
      updateForm(editingForm.id, values);
      toast({ title: 'Success', description: 'Form updated.' });
    } else {
      addForm(values);
      toast({ title: 'Success', description: 'Form created.' });
    }
    setEditingForm(null);
    setIsFormDialogOpen(false);
  };
  
  const handleOpenEditFormDialog = (form: CustomForm) => {
    setEditingForm(form);
    setIsFormDialogOpen(true);
  }

  const handleOpenNewFormDialog = () => {
    setEditingForm(null);
    setIsFormDialogOpen(true);
  }

  const handleDeleteForm = () => {
    if (!formToDelete) return;
    formEntries
      .filter(entry => entry.formId === formToDelete.id)
      .forEach(entry => deleteEntry(entry.id));
    deleteForm(formToDelete.id);
    toast({ title: 'Success', description: `Form "${formToDelete.title}" and all its entries have been deleted.` });
    setFormToDelete(null);
  };
  
  const handleImportForm = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        
        if (!sheetName) {
            toast({ variant: 'destructive', title: 'Import Error', description: 'Excel file is empty or invalid.' });
            return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {header: 1}) as any[][];

        if (json.length === 0) {
          toast({ variant: 'destructive', title: 'Import Error', description: 'The first sheet in the Excel file is empty.' });
          return;
        }
        
        // Find header row
        let headerRowIndex = -1;
        let fieldNameIndex = -1;
        let fieldTypeIndex = -1;

        for (let i = 0; i < json.length; i++) {
            const row = json[i];
            const tempFieldNameIndex = row.findIndex((cell: any) => String(cell).trim().toLowerCase() === 'field name');
            const tempFieldTypeIndex = row.findIndex((cell: any) => String(cell).trim().toLowerCase() === 'field type');

            if (tempFieldNameIndex !== -1 && tempFieldTypeIndex !== -1) {
                headerRowIndex = i;
                fieldNameIndex = tempFieldNameIndex;
                fieldTypeIndex = tempFieldTypeIndex;
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            toast({ variant: 'destructive', title: 'Import Error', description: "Could not find 'Field Name' and 'Field Type' columns in the Excel file." });
            return;
        }
        
        const dataRows = json.slice(headerRowIndex + 1);
        const fields: CustomFormField[] = [];
        let hasError = false;

        dataRows.forEach((row, index) => {
            const fieldName = row[fieldNameIndex];
            const fieldType = row[fieldTypeIndex];

            if (!fieldName && !fieldType) {
                return;
            }
            
            if (!fieldName || !fieldType) {
                toast({ variant: 'destructive', title: 'Import Error', description: `Row ${headerRowIndex + index + 2} is missing 'Field Name' or 'Field Type'.` });
                hasError = true;
                return;
            }
            
            const validation = CustomFormFieldTypeSchema.safeParse(String(fieldType).trim().toLowerCase());
            if (!validation.success) {
                toast({ variant: 'destructive', title: 'Import Error', description: `Invalid field type "${fieldType}" in row ${headerRowIndex + index + 2}.` });
                hasError = true;
                return;
            }

            fields.push({ name: fieldName, type: validation.data });
        });

        if (hasError) return;

        if (fields.length === 0) {
             toast({ variant: 'destructive', title: 'Import Error', description: 'No valid fields found in the Excel file.' });
             return;
        }

        const newForm: Omit<CustomForm, 'id'> = {
            title: sheetName,
            fields: fields,
        };

        addForm(newForm);
        toast({ title: 'Import Successful', description: `Form "${sheetName}" with ${fields.length} fields has been created.` });

      } catch (error) {
        console.error('Form import error:', error);
        toast({ variant: 'destructive', title: 'Import Error', description: 'Failed to read or process the Excel file for form creation.' });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset file input
  };
  
  // --- Sheet Logic ---
  const handleSheetSubmit = (values: Omit<SheetDefinition, 'id'>) => {
    if (editingSheet) {
      updateSheet(editingSheet.id, values);
      toast({ title: 'Success', description: 'Sheet updated.' });
    } else {
      addSheet(values);
      toast({ title: 'Success', description: 'Sheet created.' });
    }
    setEditingSheet(null);
    setIsSheetCreateDialogOpen(false);
  };
  
  const handleOpenEditSheetDialog = (sheet: SheetDefinition) => {
    setEditingSheet(sheet);
    setIsSheetCreateDialogOpen(true);
  }
  
  const handleOpenNewSheetDialog = () => {
    setEditingSheet(null);
    setIsSheetCreateDialogOpen(true);
  }
  
  const handleDeleteSheet = () => {
    if (!sheetToDelete) return;
    sheetCells
      .filter(cell => cell.sheetId === sheetToDelete.id)
      .forEach(cell => deleteCell(cell.id));
    deleteSheet(sheetToDelete.id);
    toast({ title: 'Success', description: `Sheet "${sheetToDelete.name}" and all its data have been deleted.` });
    setSheetToDelete(null);
  }

  const handleCellChange = (sheetId: string, row: number, col: number, value: string) => {
    const existingCell = sheetCells.find(c => c.sheetId === sheetId && c.row === row && c.col === col);
    if (value) {
        const encryptedValue = encrypt(value);
        if(existingCell) {
            updateCell(existingCell.id, { value: encryptedValue });
        } else {
            addCell({ sheetId, row, col, value: encryptedValue });
        }
    } else {
        if(existingCell) {
            deleteCell(existingCell.id);
        }
    }
  }
  
  const isLoading = authLoading || formsLoading || entriesLoading || sheetsLoading || cellsLoading;

  if (!isClient || !user || user.role !== 'Admin') {
    return (
        <div className="container mx-auto space-y-6">
            <Skeleton className="h-40 w-full" />
             <Skeleton className="h-20 w-full" />
        </div>
    );
  }
  
  return (
    <div className="container mx-auto space-y-6">
       <Tabs defaultValue="forms" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="sheets">Sheets</TabsTrigger>
        </TabsList>
        <TabsContent value="forms">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Custom Forms</CardTitle>
                    <CardDescription>Create and manage encrypted data forms.</CardDescription>
                </div>
                <div className='flex gap-2'>
                    <input type="file" id="import-form-structure" className="hidden" accept=".xlsx, .xls" onChange={handleImportForm} />
                     <Button variant="outline" onClick={() => document.getElementById('import-form-structure')?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                    <Button onClick={handleOpenNewFormDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Form
                    </Button>
                </div>
                </CardHeader>
                <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : customForms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customForms.map((form) => (
                        <Card 
                            key={form.id} 
                            className="flex flex-col justify-between p-4"
                        >
                        <div className='flex-grow cursor-pointer' onClick={() => { setSelectedForm(form); setIsEntriesSheetOpen(true); }}>
                            <h3 className="font-semibold">{form.title}</h3>
                            <p className="text-sm text-muted-foreground">{form.fields.length} fields</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-4">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEditFormDialog(form); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setFormToDelete(form); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        </Card>
                    ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground p-4">No custom forms created yet.</p>
                )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="sheets">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Encrypted Sheets</CardTitle>
                    <CardDescription>Create and manage encrypted data sheets.</CardDescription>
                </div>
                <Button onClick={handleOpenNewSheetDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Sheet
                </Button>
                </CardHeader>
                <CardContent>
                 {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : sheets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sheets.map((sheet) => (
                        <Card 
                            key={sheet.id} 
                            className="flex flex-col justify-between p-4"
                        >
                        <div className='flex-grow cursor-pointer' onClick={() => { setSelectedSheet(sheet); setIsSheetViewOpen(true); }}>
                            <h3 className="font-semibold">{sheet.name}</h3>
                            <p className="text-sm text-muted-foreground">{sheet.rows} rows &times; {sheet.cols} columns</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-4">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEditSheetDialog(sheet); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSheetToDelete(sheet); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        </Card>
                    ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground p-4">No sheets created yet.</p>
                )}
                </CardContent>
            </Card>
        </TabsContent>
       </Tabs>
      
      {/* Form Dialogs */}
      <CustomFormDialog 
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleFormSubmit}
        editingForm={editingForm}
      />

      {selectedForm && (
        <EntriesDialog
          isOpen={isEntriesSheetOpen}
          onOpenChange={setIsEntriesSheetOpen}
          form={selectedForm}
          entries={formEntries.filter(e => e.formId === selectedForm.id)}
          onAddEntry={addEntry}
          onUpdateEntry={updateEntry}
          onDeleteEntry={deleteEntry}
          encrypt={encrypt}
          decrypt={decrypt}
        />
      )}

      <AlertDialog open={!!formToDelete} onOpenChange={() => setFormToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the form
                    "{formToDelete?.title}" and all its entries.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFormToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteForm} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet Dialogs */}
      <SheetCreateDialog
        isOpen={isSheetCreateDialogOpen}
        onOpenChange={setIsSheetCreateDialogOpen}
        onSubmit={handleSheetSubmit}
        editingSheet={editingSheet}
      />

      {selectedSheet && (
        <SheetViewDialog
            isOpen={isSheetViewOpen}
            onOpenChange={setIsSheetViewOpen}
            sheet={selectedSheet}
            cells={sheetCells.filter(c => c.sheetId === selectedSheet.id)}
            onCellChange={handleCellChange}
            encrypt={encrypt}
            decrypt={decrypt}
        />
      )}

      <AlertDialog open={!!sheetToDelete} onOpenChange={() => setSheetToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the sheet
                    "{sheetToDelete?.name}" and all its data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSheetToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSheet} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
