
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
      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser);

        // ALWAYS read from localStorage after auth state changes.
        // This makes onAuthStateChanged the single source of truth.
        const storedUserJSON = localStorage.getItem('user');
        const storedUser = storedUserJSON ? JSON.parse(storedUserJSON) : null;
        
        if (currentFirebaseUser.isAnonymous) {
            // For anonymous users, the name is ONLY in local storage.
            if (storedUser?.name) {
                setUser({ name: storedUser.name, role: 'Employee' });
            } else {
                // This state is inconsistent, sign out.
                await signOut(auth);
            }
        } else {
            // For registered admins, firebase profile is the source of truth.
            const name = currentFirebaseUser.displayName || currentFirebaseUser.email?.split('@')[0] || 'Admin';
            const email = currentFirebaseUser.email || undefined;
            const adminUser = { name, email, role: 'Admin' as const };
            setUser(adminUser);
            localStorage.setItem('user', JSON.stringify(adminUser)); // Keep LS in sync

            // Add admin to the admins list for notifications
            const adminRef = ref(database, `admins/${currentFirebaseUser.uid}`);
            set(adminRef, true);
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

  const logout = useCallback(async () => {
    await signOut(auth);
    // State will be cleared by onAuthStateChanged listener
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
