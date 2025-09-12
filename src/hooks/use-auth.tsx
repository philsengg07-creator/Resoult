
'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { type User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser, signInAnonymously } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      setLoading(true);
      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser);

        const storedUserJSON = localStorage.getItem('user');
        const storedUser = storedUserJSON ? JSON.parse(storedUserJSON) : null;
        
        if (currentFirebaseUser.isAnonymous) {
            // Ensure we have a name for anonymous users, otherwise, it's an invalid state.
            if (storedUser?.name) {
                setUser({ name: storedUser.name, role: 'Employee' });
            } else {
                // This case should ideally not happen if login flow is correct.
                // You might want to handle this by signing out or redirecting.
                signOut(auth);
            }
        } else {
            const name = currentFirebaseUser.displayName || currentFirebaseUser.email?.split('@')[0] || 'Admin';
            const email = currentFirebaseUser.email || undefined;
            const adminUser = { name, email, role: 'Admin' as const };
            setUser(adminUser);
            localStorage.setItem('user', JSON.stringify(adminUser));
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/role-selection';
    
    if (!user) {
      if (!isAuthPage) {
        router.push('/role-selection');
      }
    } else {
      if (isAuthPage) {
        router.push(user.role === 'Admin' ? '/dashboard' : '/tickets/new');
      }
    }
  }, [user, pathname, router, loading]);
  
  const login = useCallback((userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Redirection is now handled by the useEffect above
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    // Clear local storage on logout to ensure clean state
    localStorage.removeItem('user');
    setUser(null);
    setFirebaseUser(null);
    router.push('/role-selection');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
