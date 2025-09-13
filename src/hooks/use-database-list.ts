
'use client';
import { useState, useEffect, useMemo } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, off } from 'firebase/database';
import { useAuth } from './use-auth';

const EMPLOYEE_SHARED_ID = 'employee_shared';
const ADMIN_UID = 'Pb2Pgfb4EiXMGLrNV1y24i3qa6C3'; 

export function useDatabaseList<T extends { id: string }>(path: string) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = useMemo(() => firebaseUser?.uid, [firebaseUser]);

  useEffect(() => {
    if (authLoading || !currentUserId) {
      if (!authLoading) setLoading(false);
      return;
    }
    setLoading(true);

    const isAdmin = user?.role === 'Admin';
    const sharedAdminPaths = ['tickets', 'renewals', 'customForms', 'formEntries'];

    let dataPath: string | null = null;
    
    if (isAdmin) {
      // Admins read from the central admin UID for shared paths, and their own UID for others (like notifications)
      if (sharedAdminPaths.includes(path)) {
        dataPath = `data/${ADMIN_UID}/${path}`;
      } else {
        dataPath = `data/${currentUserId}/${path}`;
      }
    } else {
      // Employees only access their own user-specific data or the shared space for *creating* tickets.
      // For reading, they should only access their own notifications etc.
      // This logic prevents employees from trying to read admin-only paths like renewals/customForms.
      if (path === 'notifications') {
         dataPath = `data/${currentUserId}/${path}`;
      } else if (path !== 'renewals' && path !== 'customForms' && path !== 'formEntries') {
         // Fallback for any other potential shared read paths for employees (currently none)
         dataPath = `data/${EMPLOYEE_SHARED_ID}/${path}`;
      }
    }

    if (!dataPath) {
      setLoading(false);
      setData([]);
      return; // If no valid path, do nothing.
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

    const sharedWritePaths = ['tickets', 'renewals', 'customForms', 'formEntries'];
    let writePath;

    // Tickets are written by employees to the admin space.
    // Admin-only data is also written to the admin space.
    if (sharedWritePaths.includes(path)) {
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
    
    const originalItem = data.find(d => d.id === id);
    if (!originalItem) throw new Error(`Item with id ${id} not found.`);

    const sharedWritePaths = ['tickets', 'renewals', 'customForms', 'formEntries'];
    let writePath;
     if (sharedWritePaths.includes(path)) {
        writePath = `data/${ADMIN_UID}/${path}/${id}`;
    } else {
        writePath = `data/${currentUserId}/${path}/${id}`;
    }
    
    const itemRef = ref(database, writePath);
    const { id: _, ...rest } = item as any;
    const currentItem = data.find(d => d.id === id);
    set(itemRef, { ...currentItem, ...rest });
  };
  
  const removeById = (id: string) => {
    if (!currentUserId) throw new Error('User not authenticated');
    
    const originalItem = data.find(d => d.id === id);
    if (!originalItem) throw new Error(`Item with id ${id} not found.`);
    
    const sharedWritePaths = ['tickets', 'renewals', 'customForms', 'formEntries'];
    let writePath;
     if (sharedWritePaths.includes(path)) {
        writePath = `data/${ADMIN_UID}/${path}/${id}`;
    } else {
        writePath = `data/${currentUserId}/${path}/${id}`;
    }
    
    const itemRef = ref(database, writePath);
    remove(itemRef);
  };

  return { data, loading, add, update, removeById };
}
