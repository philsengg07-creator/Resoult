
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { type SheetDefinition } from '@/types';

const sheetFormSchema = z.object({
  name: z.string().min(2, 'Sheet name is required.'),
  rows: z.coerce.number().int().min(1, 'Must have at least 1 row.'),
  cols: z.coerce.number().int().min(1, 'Must have at least 1 column.'),
});

type SheetFormValues = z.infer<typeof sheetFormSchema>;

interface SheetCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Omit<SheetDefinition, 'id'>) => void;
  editingSheet: SheetDefinition | null;
}

export function SheetCreateDialog({ isOpen, onOpenChange, onSubmit, editingSheet }: SheetCreateDialogProps) {
  const form = useForm<SheetFormValues>({
    resolver: zodResolver(sheetFormSchema),
    defaultValues: {
      name: '',
      rows: 10,
      cols: 5,
    },
  });

  useEffect(() => {
    if (editingSheet) {
      form.reset({
        name: editingSheet.name,
        rows: editingSheet.rows,
        cols: editingSheet.cols,
      });
    } else {
      form.reset({
        name: '',
        rows: 10,
        cols: 5,
      });
    }
  }, [editingSheet, form, isOpen]);

  const handleFormSubmit = (values: SheetFormValues) => {
    onSubmit(values);
    form.reset();
  };

  return (
    <Dialog 
        open={isOpen} 
        onOpenChange={onOpenChange}
    >
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editingSheet ? 'Edit Sheet' : 'Create New Sheet'}</DialogTitle>
          <DialogDescription>
            {editingSheet ? 'Modify the properties of your sheet.' : 'Define the name and initial dimensions of your new sheet.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} id="sheet-form" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sheet Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Project Passwords" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rows"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rows</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cols"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Columns</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="sheet-form">
            {editingSheet ? 'Save Changes' : 'Create Sheet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
