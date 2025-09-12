
'use client';
import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { useAuth } from './use-auth';

export function useDatabaseObject<T>(path: string, initialValue: T): [T, (value: T) => void, boolean] {
  const { user, firebaseUser } = useAuth();
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  
  const userId = user?.role === 'Admin' ? firebaseUser?.uid : 'employee_shared';

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const dataRef = ref(database, `data/${userId}/${path}`);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      setData(val !== null ? val : initialValue);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [path, userId, initialValue]);

  const update = (value: T) => {
    if (!userId) throw new Error('User not authenticated');
    const dataRef = ref(database, `data/${userId}/${path}`);
    set(dataRef, value);
  };

  return [data, update, loading];
}
