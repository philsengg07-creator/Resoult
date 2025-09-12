
'use client';
import { useState, useEffect, useMemo } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, child, remove } from 'firebase/database';
import { useAuth } from './use-auth';

export function useDatabaseList<T extends { id: string }>(path: string) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => {
    if (authLoading) return null;
    return user?.role === 'Admin' ? firebaseUser?.uid : 'employee_shared';
  }, [user, firebaseUser, authLoading]);


  useEffect(() => {
    if (!userId) {
      if (!authLoading) {
        setLoading(false);
        setData([]);
      }
      return;
    }

    setLoading(true);
    const dataRef = ref(database, `data/${userId}/${path}`);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list: T[] = Object.keys(val).map(key => ({
          ...val[key],
          id: key,
        }));
        setData(list);
      } else {
        setData([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [path, userId, authLoading]);

  const add = (item: Omit<T, 'id'>): string => {
    if (!userId) throw new Error('User not authenticated or still loading');
    const dataRef = ref(database, `data/${userId}/${path}`);
    const newItemRef = push(dataRef);
    set(newItemRef, item);
    return newItemRef.key!;
  };

  const update = (id: string, item: Partial<T>) => {
    if (!userId) throw new Error('User not authenticated or still loading');
    const itemRef = ref(database, `data/${userId}/${path}/${id}`);
    const { id: _, ...rest } = item as any; // Don't save id in the object
    const currentItem = data.find(d => d.id === id);
    set(itemRef, { ...currentItem, ...rest });
  };
  
  const removeById = (id: string) => {
    if (!userId) throw new Error('User not authenticated or still loading');
    const itemRef = ref(database, `data/${userId}/${path}/${id}`);
    remove(itemRef);
  };

  return { data, loading: loading || authLoading, add, update, removeById };
}
