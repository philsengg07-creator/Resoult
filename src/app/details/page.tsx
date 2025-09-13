
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDatabaseList } from '@/hooks/use-database-list';
import { type CustomForm, type FormEntry } from '@/types';
import * as crypto from 'crypto-js';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
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


const ENCRYPTION_KEY_PROMPT_KEY = 'adminonly@123';

export default function DetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [keyPromptOpen, setKeyPromptOpen] = useState(true);
  const [tempKey, setTempKey] = useState('');

  const [isClient, setIsClient] = useState(false);
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<CustomForm | null>(null);


  const { data: customForms, add: addForm, update: updateForm, removeById: deleteForm, loading: formsLoading } = useDatabaseList<CustomForm>('customForms');
  const { data: formEntries, add: addEntry, update: updateEntry, removeById: deleteEntry, loading: entriesLoading } = useDatabaseList<FormEntry>('formEntries');

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

  const handleKeySubmit = () => {
    if (tempKey === ENCRYPTION_KEY_PROMPT_KEY) {
      setEncryptionKey(tempKey);
      setKeyPromptOpen(false);
      toast({ title: 'Success', description: 'Encryption key accepted.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid encryption key.' });
    }
  };

  const encrypt = (text: string): string => {
    if (!encryptionKey) throw new Error('Encryption key not set.');
    return crypto.AES.encrypt(text, encryptionKey).toString();
  };

  const decrypt = (ciphertext: string): string => {
    if (!encryptionKey) throw new Error('Encryption key not set.');
    const bytes = crypto.AES.decrypt(ciphertext, encryptionKey);
    return bytes.toString(crypto.enc.Utf8);
  };

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
  
  const handleOpenEditDialog = (form: CustomForm) => {
    setEditingForm(form);
    setIsFormDialogOpen(true);
  }

  const handleOpenNewDialog = () => {
    setEditingForm(null);
    setIsFormDialogOpen(true);
  }

  const handleDeleteForm = () => {
    if (!formToDelete) return;
    // Also delete all entries associated with this form
    formEntries
      .filter(entry => entry.formId === formToDelete.id)
      .forEach(entry => deleteEntry(entry.id));
    deleteForm(formToDelete.id);
    toast({ title: 'Success', description: `Form "${formToDelete.title}" and all its entries have been deleted.` });
    setFormToDelete(null);
  };
  
  const isLoading = authLoading || formsLoading || entriesLoading;

  if (!isClient || !user || user.role !== 'Admin') {
    return (
        <div className="container mx-auto space-y-6">
            <Skeleton className="h-40 w-full" />
             <Skeleton className="h-20 w-full" />
        </div>
    );
  }

  if (!encryptionKey) {
    return (
      <Dialog open={keyPromptOpen} onOpenChange={setKeyPromptOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Encryption Key</DialogTitle>
            <DialogDescription>
              You must provide the encryption key to access this module.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="key" className="text-right">
                Key
              </Label>
              <Input
                id="key"
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleKeySubmit}>Submit Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Forms</CardTitle>
            <CardDescription>Create and manage encrypted data forms.</CardDescription>
          </div>
          <Button onClick={handleOpenNewDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Form
          </Button>
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
                  <div className='flex-grow cursor-pointer' onClick={() => { setSelectedForm(form); setIsFormSheetOpen(true); }}>
                    <h3 className="font-semibold">{form.title}</h3>
                    <p className="text-sm text-muted-foreground">{form.fields.length} fields</p>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(form); }}>
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
            <p className="text-center text-muted-foreground">No custom forms created yet.</p>
          )}
        </CardContent>
      </Card>
      
      <CustomFormDialog 
        isOpen={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleFormSubmit}
        editingForm={editingForm}
      />

      {selectedForm && (
        <EntriesDialog
          isOpen={isFormSheetOpen}
          onOpenChange={setIsFormSheetOpen}
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
    </div>
  );
}
