
'use client';
import { useState, useEffect, useMemo } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { useAuth } from './use-auth';

export function useDatabaseObject<T>(path: string, initialValue: T): [T, (value: T) => void, boolean] {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  
  const userId = useMemo(() => {
    if (authLoading) return null;
    return user?.role === 'Admin' ? firebaseUser?.uid : 'employee_shared';
  }, [user, firebaseUser, authLoading]);


  useEffect(() => {
    if (!userId) {
       if (!authLoading) {
        setLoading(false);
       }
      return;
    }
    
    setLoading(true);
    const dataRef = ref(database, `data/${userId}/${path}`);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      setData(val !== null ? val : initialValue);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [path, userId, initialValue, authLoading]);

  const update = (value: T) => {
    if (!userId) throw new Error('User not authenticated or still loading');
    const dataRef = ref(database, `data/${userId}/${path}`);
    set(dataRef, value);
  };

  return [data, update, loading || authLoading];
}
