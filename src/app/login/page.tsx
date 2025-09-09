'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/icons/logo';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const employeeLoginSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
});

function LoginPageContent() {
  const { login, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const role = searchParams.get('role');

  const form = useForm<z.infer<typeof employeeLoginSchema>>({
    resolver: zodResolver(employeeLoginSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!role) {
      router.push('/role-selection');
    }
     if (user) {
      router.push(user.role === 'Admin' ? '/tickets' : '/tickets/new');
    }
  }, [role, router, user]);

  function onEmployeeSubmit(values: z.infer<typeof employeeLoginSchema>) {
    login({ name: values.name, role: 'Employee' });
  }

  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.displayName) {
        login({ name: result.user.displayName, role: 'Admin' });
      } else {
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Could not retrieve your name from Google. Please try again.',
        })
      }
    } catch (error) {
      console.error('Firebase authentication error:', error);
       toast({
            variant: 'destructive',
            title: 'Login Error',
            description: 'An error occurred during sign-in. Please try again.',
        })
    }
  };
  
  if (!role) {
      return null; // or a loading spinner
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4 h-12 w-12 text-primary" />
          <CardTitle>Welcome to Resolut</CardTitle>
          <CardDescription>
            {role === 'Admin' ? 'Sign in as an Admin' : 'Sign in as an Employee'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {role === 'Employee' ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onEmployeeSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </form>
            </Form>
          ) : (
             <Button onClick={handleAdminLogin} className="w-full">
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 25.5 170.3 65.9l-63.7 63.7C324.5 112.3 289.3 96 248 96c-88.8 0-160.1 71.1-160.1 160.1s71.4 160.1 160.1 160.1c98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
                Sign in with Google
            </Button>
          )}
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
    )
}
