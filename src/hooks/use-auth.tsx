
'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';
import { type User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<User | null>('user', null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isAuthPage = pathname === '/login' || pathname === '/role-selection';
    if (!user && !isAuthPage) {
      router.push('/role-selection');
    } else if (user && isAuthPage) {
      router.push(user.role === 'Admin' ? '/dashboard' : '/tickets/new');
    }
  }, [user, pathname, router]);
  
  const login = useCallback((userData: User) => {
    setUser(userData);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    router.push(userData.role === 'Admin' ? '/dashboard' : '/tickets/new');
  }, [setUser, router]);

  const logout = useCallback(async () => {
    if (user?.role === 'Admin') {
      await signOut(auth);
    }
    setUser(null);
    router.push('/role-selection');
  }, [setUser, router, user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
