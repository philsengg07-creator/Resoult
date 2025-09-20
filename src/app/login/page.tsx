
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/icons/logo';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const adminLoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const adminRegisterSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type AdminLoginValues = z.infer<typeof adminLoginSchema>;
type AdminRegisterValues = z.infer<typeof adminRegisterSchema>;
type AdminFormValues = AdminLoginValues | AdminRegisterValues;


function LoginPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminForm = useForm<AdminFormValues>({
    resolver: zodResolver(isRegistering ? adminRegisterSchema : adminLoginSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    adminForm.reset({ name: '', email: '', password: '' });
  }, [isRegistering, adminForm])

  async function onAdminSubmit(values: AdminFormValues) {
    setIsSubmitting(true);
    try {
        let userCredential;
        if(isRegistering) {
            const registerValues = values as AdminRegisterValues;
            userCredential = await createUserWithEmailAndPassword(auth, registerValues.email, registerValues.password);
            await updateProfile(userCredential.user, { displayName: registerValues.name });
            const adminUser = { name: registerValues.name, role: 'Admin' as const, email: registerValues.email };
            localStorage.setItem('user', JSON.stringify(adminUser));

        } else {
            const loginValues = values as AdminLoginValues;
            userCredential = await signInWithEmailAndPassword(auth, loginValues.email, loginValues.password);
            const name = userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Admin';
            const adminUser = { name, role: 'Admin' as const, email: userCredential.user.email ?? undefined };
            localStorage.setItem('user', JSON.stringify(adminUser));
        }

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        // The useAuth hook will handle redirection.

    } catch (error: any) {
      console.error('Firebase authentication error:', error);
       toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: error.message || 'An error occurred. Please try again.',
        })
        setIsSubmitting(false);
    }
  }

  if (loading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 h-12 w-12 text-primary" />
          <CardTitle>Welcome to Resolut</CardTitle>
          <CardDescription>
            {isRegistering ? 'Create an Admin Account' : 'Sign in as an Admin'}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...adminForm}>
                <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                 {isRegistering && (
                     <FormField
                        control={adminForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                 )}
                 <FormField
                    control={adminForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="admin@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                    control={adminForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isRegistering ? 'Create Account' : 'Sign In'}
                </Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
