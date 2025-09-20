
'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { type User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { auth, database } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { ref, set } from 'firebase/database';


interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
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
      if (currentFirebaseUser && !currentFirebaseUser.isAnonymous) {
        setFirebaseUser(currentFirebaseUser);
        const name = currentFirebaseUser.displayName || currentFirebaseUser.email?.split('@')[0] || 'Admin';
        const email = currentFirebaseUser.email || undefined;
        const adminUser = { name, email, role: 'Admin' as const };
        setUser(adminUser);
        localStorage.setItem('user', JSON.stringify(adminUser));
      } else {
        // If user is anonymous or doesn't exist, treat as logged out
        if (currentFirebaseUser?.isAnonymous) {
            await signOut(auth); // Sign out any anonymous sessions
        }
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
        router.push('/login');
      }
    } else { // User is an admin
      if (isAuthPage) {
        router.push('/dashboard');
      }
    }
  }, [user, pathname, router, loading]);

  const logout = useCallback(async () => {
    await signOut(auth);
    // State will be cleared by onAuthStateChanged listener, which also triggers redirect
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, logout, loading }}>
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
