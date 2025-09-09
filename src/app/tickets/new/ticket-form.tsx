'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type Ticket } from '@/types';
import { analyzeImageForInfo } from '@/ai/flows/analyze-image-for-info';
import { suggestPotentialSolutions } from '@/ai/flows/suggest-potential-solutions';
import { summarizeTicketProblem } from '@/ai/flows/summarize-ticket-problem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  problemDescription: z.string().min(10, { message: 'Please provide a detailed description of at least 10 characters.' }),
  additionalInfo: z.string().optional(),
});

export function TicketForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setTickets] = useLocalStorage<Ticket[]>('tickets', []);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiStatus, setAiStatus] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', problemDescription: '', additionalInfo: '' },
  });

  useEffect(() => {
    if (user?.name) {
      form.setValue('name', user.name);
    }
  }, [user, form]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  };
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      let summary = '', imageAnalysis = '', suggestedSolutions = '';
      
      setAiStatus('Summarizing problem...');
      const summaryResult = await summarizeTicketProblem({ problemDescription: values.problemDescription });
      summary = summaryResult.summary;

      if (photoPreview) {
        setAiStatus('Analyzing image...');
        const imageAnalysisResult = await analyzeImageForInfo({ photoDataUri: photoPreview, description: values.problemDescription });
        imageAnalysis = imageAnalysisResult.extractedInformation;
      }
      
      setAiStatus('Suggesting solutions...');
      const solutionsResult = await suggestPotentialSolutions({
        description: values.problemDescription,
        extractedImageInformation: imageAnalysis || 'No image provided.',
      });
      suggestedSolutions = solutionsResult.suggestedSolutions;

      setAiStatus('Finalizing ticket...');
      const newTicket: Ticket = {
        id: crypto.randomUUID(),
        ...values,
        createdAt: new Date().toISOString(),
        status: 'Open',
        photo: photoPreview ?? undefined,
        summary,
        imageAnalysis: imageAnalysis || undefined,
        suggestedSolutions,
      };

      setTickets((prev) => [...prev, newTicket]);
      toast({
        title: 'Ticket Created!',
        description: 'Your support ticket has been submitted and is being processed.',
      });
      router.push(user?.role === 'Admin' ? '/tickets' : '/tickets/new');
      if (user?.role === 'Employee') {
        form.reset({ name: user.name, problemDescription: '', additionalInfo: '' });
        removePhoto();
        setIsSubmitting(false);
      }

    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Could not create ticket. Please try again.',
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Support Ticket</CardTitle>
        <CardDescription>Fill out the form below and our team will get back to you.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} disabled={!!user?.name} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="problemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problem Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the issue in detail..." {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Attach Photo (optional)</FormLabel>
              <FormControl>
                <div>
                  <Input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('photo-upload')?.click()} className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                </div>
              </FormControl>
              {photoPreview && (
                <div className="relative mt-4 w-full h-48 rounded-md overflow-hidden border">
                  <Image src={photoPreview} alt="Photo preview" layout="fill" objectFit="contain" />
                  <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={removePhoto}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </FormItem>

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any other details, like error messages or steps to reproduce..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col items-stretch">
            {isSubmitting && (
                <div className="flex items-center justify-center w-full mb-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {aiStatus || 'Submitting...'}
                </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Processing...' : 'Create Ticket'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
