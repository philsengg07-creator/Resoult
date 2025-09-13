
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { type CustomForm, CustomFormFieldSchema, CustomFormFieldTypeSchema } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(2, 'Title is required.'),
  fields: z.array(CustomFormFieldSchema).min(1, 'At least one field is required.'),
});

type FormBuilderValues = z.infer<typeof formSchema>;

interface CustomFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Omit<CustomForm, 'id'>) => void;
  editingForm: CustomForm | null;
}

function SubFieldsArray({ control, nestIndex }: { control: Control<FormBuilderValues>; nestIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `fields.${nestIndex}.fields`,
  });

  return (
    <div className="pl-4 mt-4 space-y-3">
        <Label className="text-xs font-semibold">Sub-fields</Label>
        <div className="relative">
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex w-max space-x-4 p-2">
                    {fields.map((item, k) => (
                        <div key={item.id} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/50 w-[300px]">
                            <FormField
                                control={control}
                                name={`fields.${nestIndex}.fields.${k}.name`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Sub-field Name</FormLabel>
                                    <FormControl>
                                    <Input placeholder={`Sub-field ${k + 1}`} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`fields.${nestIndex}.fields.${k}.type`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Sub-field Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="textarea">Textarea</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="time">Time</SelectItem>
                                        <SelectItem value="datetime">Date & Time</SelectItem>
                                        <SelectItem value="boolean">Yes/No</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <Button type="button" variant="destructive" size="sm" onClick={() => remove(k)} className="mt-1">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        </div>
                    ))}
                    <div className="flex items-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ name: '', type: 'text' })}
                            className="h-full"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Sub-field
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    </div>
  );
}

export function CustomFormDialog({ isOpen, onOpenChange, onSubmit, editingForm }: CustomFormDialogProps) {
  const form = useForm<FormBuilderValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      fields: [{ name: '', type: 'text' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });
  
  const watchedFields = form.watch('fields');

  useEffect(() => {
    if (editingForm) {
      form.reset({
        title: editingForm.title,
        fields: editingForm.fields,
      });
    } else {
      form.reset({
        title: '',
        fields: [{ name: '', type: 'text' }],
      });
    }
  }, [editingForm, form, isOpen]);

  const handleFormSubmit = (values: FormBuilderValues) => {
    onSubmit(values);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] grid-rows-[auto_1fr_auto] p-0 max-h-[90svh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{editingForm ? 'Edit Form' : 'Create New Form'}</DialogTitle>
          <DialogDescription>
            {editingForm ? 'Modify the details of your form.' : 'Define the structure of your new custom form.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} id="custom-form" className="space-y-6">
                        <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Form Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Server Credentials" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <div>
                        <FormLabel>Fields</FormLabel>
                        <div className="space-y-4 mt-2">
                            {fields.map((field, index) => (
                            <div key={field.id} className="p-3 border rounded-md">
                                <div className="flex items-end gap-2">
                                    <FormField
                                    control={form.control}
                                    name={`fields.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                        <FormLabel className="text-xs">Field Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder={`Field ${index + 1}`} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name={`fields.${index}.type`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="text-xs">Field Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger className='w-[140px]'>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="textarea">Textarea</SelectItem>
                                            <SelectItem value="date">Date</SelectItem>
                                            <SelectItem value="time">Time</SelectItem>
                                            <SelectItem value="datetime">Date & Time</SelectItem>
                                            <SelectItem value="boolean">Yes/No</SelectItem>
                                            <SelectItem value="group">Group</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                {watchedFields[index]?.type === 'group' && <SubFieldsArray control={form.control} nestIndex={index} />}
                            </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', type: 'text' })} className="mt-4">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Field
                        </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-0">
          <Button type="submit" form="custom-form">{editingForm ? 'Save Changes' : 'Create Form'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
