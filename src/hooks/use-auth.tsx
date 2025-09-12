
'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { type User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

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
    const unsubscribe = onAuthStateChanged(auth, (currentFirebaseUser) => {
      setFirebaseUser(currentFirebaseUser);
      if (currentFirebaseUser) {
        const name = currentFirebaseUser.displayName || currentFirebaseUser.email?.split('@')[0] || 'Admin';
        const email = currentFirebaseUser.email || undefined;
        // Simple role determination. In a real app, this would be more secure.
        setUser({ name, email, role: 'Admin' });
      } else {
        const storedUser = localStorage.getItem('user');
        if(storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.role === 'Employee') {
                    setUser(parsedUser);
                } else {
                    setUser(null);
                }
            } catch {
                setUser(null);
            }
        } else {
            setUser(null);
        }
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
    // For employee login, we'll use local storage since they don't have a Firebase account
    if (userData.role === 'Employee') {
        localStorage.setItem('user', JSON.stringify(userData));
    }
    setUser(userData);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    router.push(userData.role === 'Admin' ? '/dashboard' : '/tickets/new');
  }, [router]);

  const logout = useCallback(async () => {
    if (user?.role === 'Admin') {
      await signOut(auth);
    }
    // For employees, or just to be safe
    localStorage.removeItem('user');
    setUser(null);
    router.push('/role-selection');
  }, [router, user]);

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
