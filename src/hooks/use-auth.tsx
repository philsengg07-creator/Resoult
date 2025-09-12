
'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { type User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser, updateProfile } from 'firebase/auth';

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

        // Check if user object exists in localStorage to get role and name
        const storedUserJSON = localStorage.getItem('user');
        const storedUser = storedUserJSON ? JSON.parse(storedUserJSON) : null;
        
        if (currentFirebaseUser.isAnonymous) {
            // Anonymous user is always an Employee
            setUser({ name: storedUser?.name || 'Employee', role: 'Employee' });
        } else {
            // This is a full user (Admin)
            if (storedUser?.role === 'Admin') {
                setUser(storedUser);
            } else {
                 const name = currentFirebaseUser.displayName || currentFirebaseUser.email?.split('@')[0] || 'Admin';
                 const email = currentFirebaseUser.email || undefined;
                 setUser({ name, email, role: 'Admin' });
            }
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
    if (!user && !isAuthPage) {
      router.push('/role-selection');
    } else if (user && isAuthPage) {
      router.push(user.role === 'Admin' ? '/dashboard' : '/tickets/new');
    }
  }, [user, pathname, router, loading]);
  
  const login = useCallback((userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    router.push(userData.role === 'Admin' ? '/dashboard' : '/tickets/new');
  }, [router]);

  const logout = useCallback(async () => {
    await signOut(auth);
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
