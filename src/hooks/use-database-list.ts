
'use client';
import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, child, remove } from 'firebase/database';
import { useAuth } from './use-auth';

export function useDatabaseList<T extends { id: string }>(path: string) {
  const { user, firebaseUser } = useAuth();
  const [data, setData] = useState<T[]>([]);
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
  }, [path, userId]);

  const add = (item: Omit<T, 'id'>): string => {
    if (!userId) throw new Error('User not authenticated');
    const dataRef = ref(database, `data/${userId}/${path}`);
    const newItemRef = push(dataRef);
    set(newItemRef, item);
    return newItemRef.key!;
  };

  const update = (id: string, item: Partial<T>) => {
    if (!userId) throw new Error('User not authenticated');
    const itemRef = ref(database, `data/${userId}/${path}/${id}`);
    const { id: _, ...rest } = item as any; // Don't save id in the object
    set(itemRef, { ...data.find(d => d.id === id), ...rest });
  };
  
  const removeById = (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    const itemRef = ref(database, `data/${userId}/${path}/${id}`);
    remove(itemRef);
  };

  return { data, loading, add, update, removeById };
}
