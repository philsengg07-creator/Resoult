
'use client';
import { useState, useEffect, useMemo } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, off } from 'firebase/database';
import { useAuth } from './use-auth';

const EMPLOYEE_SHARED_ID = 'employee_shared';
const ADMIN_UID = 'Pb2Pgfb4EiXMGLrNV1y24i3qa6C3'; 
const SHARED_ADMIN_PATHS = ['tickets', 'renewals', 'customForms', 'formEntries'];

export function useDatabaseList<T extends { id: string }>(path: string) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = useMemo(() => firebaseUser?.uid, [firebaseUser]);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) {
        setLoading(false);
        setData([]);
      }
      return;
    }
    setLoading(true);

    let dataPath: string | null = null;
    
    if (user.role === 'Admin') {
      // Admins read from the central admin UID for shared paths, and their own UID for others.
      if (SHARED_ADMIN_PATHS.includes(path)) {
        dataPath = `data/${ADMIN_UID}/${path}`;
      } else {
        dataPath = `data/${currentUserId}/${path}`;
      }
    } else { // Employee
      // Employees only access their own notifications. They should not attempt to read admin-only paths.
      if (path === 'notifications') {
         dataPath = `data/${currentUserId}/${path}`;
      }
      // For any other path, an employee should not be trying to read, so we'll set no path.
      // This prevents permission errors. The `add` function will still allow them to write tickets.
    }

    if (!dataPath) {
      setLoading(false);
      setData([]);
      return;
    }

    const dataRef = ref(database, dataPath);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      const list: T[] = val ? Object.keys(val).map(key => ({ ...val[key], id: key })) : [];
      setData(list);
      setLoading(false);
    }, (error) => {
      console.error(`Firebase read failed for path: ${dataPath}`, error);
      setLoading(false);
      setData([]);
    });

    return () => {
        off(dataRef);
    };
  }, [path, authLoading, user, currentUserId]);

  const add = (item: Omit<T, 'id'>): string => {
    if (!currentUserId) throw new Error('User not authenticated');

    let writePath;
    // Shared data is always written to the central admin path, regardless of who is writing.
    if (SHARED_ADMIN_PATHS.includes(path)) {
        writePath = `data/${ADMIN_UID}/${path}`;
    } else {
        // User-specific data (like notifications) is written to the user's own space.
        writePath = `data/${currentUserId}/${path}`;
    }
    
    const dataRef = ref(database, writePath);
    const newItemRef = push(dataRef);
    set(newItemRef, item);
    return newItemRef.key!;
  };

  const update = (id: string, item: Partial<T>) => {
    if (!currentUserId) throw new Error('User not authenticated');

    let writePath;
    if (SHARED_ADMIN_PATHS.includes(path)) {
        writePath = `data/${ADMIN_UID}/${path}/${id}`;
    } else {
        writePath = `data/${currentUserId}/${path}/${id}`;
    }
    
    const itemRef = ref(database, writePath);
    const { id: _, ...rest } = item as any;
    const currentItem = data.find(d => d.id === id);
    // Use set with merge behavior by providing the full object
    set(itemRef, { ...currentItem, ...rest });
  };
  
  const removeById = (id: string) => {
    if (!currentUserId) throw new Error('User not authenticated');
    
    let writePath;
    if (SHARED_ADMIN_PATHS.includes(path)) {
        writePath = `data/${ADMIN_UID}/${path}/${id}`;
    } else {
        writePath = `data/${currentUserId}/${path}/${id}`;
    }
    
    const itemRef = ref(database, writePath);
    remove(itemRef);
  };

  return { data, loading, add, update, removeById };
}
