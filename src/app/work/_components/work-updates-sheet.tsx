
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { type WorkItem, type WorkUpdate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
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

interface WorkUpdatesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workItem: WorkItem;
  updates: WorkUpdate[];
  onAddUpdate: (update: Omit<WorkUpdate, 'id'>) => void;
  onUpdateUpdate: (id: string, update: Partial<WorkUpdate>) => void;
  onDeleteUpdate: (id: string) => void;
}

export function WorkUpdatesSheet({ 
    isOpen, onOpenChange, workItem, updates, onAddUpdate, onUpdateUpdate, onDeleteUpdate 
}: WorkUpdatesSheetProps) {
  const { toast } = useToast();
  const [newUpdateText, setNewUpdateText] = useState('');
  const [editingUpdate, setEditingUpdate] = useState<{ id: string; text: string } | null>(null);
  const [updateToDelete, setUpdateToDelete] = useState<WorkUpdate | null>(null);

  const sortedUpdates = [...updates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddUpdate = () => {
    if (newUpdateText.trim() === '') {
      toast({ variant: 'destructive', title: 'Error', description: `Update text cannot be empty.` });
      return;
    }
    onAddUpdate({
      workItemId: workItem.id,
      text: newUpdateText,
      createdAt: new Date().toISOString(),
    });
    setNewUpdateText('');
    toast({ title: 'Success', description: 'New update added.' });
  };
  
  const handleUpdate = () => {
    if (!editingUpdate || editingUpdate.text.trim() === '') return;
    onUpdateUpdate(editingUpdate.id, { text: editingUpdate.text });
    setEditingUpdate(null);
    toast({ title: 'Success', description: 'Update saved.' });
  };

  const handleDelete = () => {
    if (!updateToDelete) return;
    onDeleteUpdate(updateToDelete.id);
    setUpdateToDelete(null);
    toast({ title: 'Success', description: 'Update deleted.' });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg w-full p-0 grid-rows-[auto_auto_1fr_auto] max-h-[90svh]">
          <SheetHeader className="p-6">
            <SheetTitle>Work Updates</SheetTitle>
            <SheetDescription className='truncate'>
              Viewing updates for: {workItem.description}
            </SheetDescription>
          </SheetHeader>
          
          <div className="p-6 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new update..."
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUpdate()}
              />
              <Button onClick={handleAddUpdate}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            </div>
          </div>
          
          <ScrollArea className="h-full border-t">
            {sortedUpdates.length > 0 ? (
                <div className='p-6 space-y-4'>
                    {sortedUpdates.map(update => (
                        <div key={update.id} className="text-sm p-3 rounded-md border bg-card">
                            <div className="flex justify-between items-start">
                                <p className="text-muted-foreground text-xs">{format(parseISO(update.createdAt), 'PPP p')}</p>
                                <div className="flex gap-1 -mt-1 -mr-1">
                                    {editingUpdate?.id === update.id ? (
                                        <>
                                            <Button size="icon" variant="ghost" onClick={handleUpdate} className='h-7 w-7'><Save className="h-4 w-4 text-green-500" /></Button>
                                            <Button size="icon" variant="ghost" onClick={() => setEditingUpdate(null)} className='h-7 w-7'><X className="h-4 w-4" /></Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button size="icon" variant="ghost" onClick={() => setEditingUpdate({ id: update.id, text: update.text })} className='h-7 w-7'><Edit className="h-4 w-4" /></Button>
                                            <Button size="icon" variant="ghost" onClick={() => setUpdateToDelete(update)} className='h-7 w-7'><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </>
                                    )}
                                </div>
                            </div>
                             {editingUpdate?.id === update.id ? (
                                 <Input 
                                     value={editingUpdate.text} 
                                     onChange={e => setEditingUpdate({...editingUpdate, text: e.target.value})}
                                     className="mt-2"
                                 />
                             ) : (
                                <p className="mt-1 whitespace-pre-wrap">{update.text}</p>
                             )}
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center text-muted-foreground p-12">
                    <p>No updates have been added yet.</p>
                 </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
       <AlertDialog open={!!updateToDelete} onOpenChange={() => setUpdateToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this update.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUpdateToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
