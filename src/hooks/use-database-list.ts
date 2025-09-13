
'use client';
import { useState, useEffect, useMemo } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, off } from 'firebase/database';
import { useAuth } from './use-auth';

const ADMIN_UID = 'Pb2Pgfb4EiXMGLrNV1y24i3qa6C3'; 
// These paths contain data shared across all admins.
const SHARED_ADMIN_PATHS = ['tickets', 'renewals', 'customForms', 'formEntries', 'work'];

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
    
    // Determine the correct read path based on user role and data type.
    if (user.role === 'Admin') {
      // If the user is an admin, they read from the central shared path for shared data,
      // and their own UID path for user-specific data (like notifications).
      if (SHARED_ADMIN_PATHS.includes(path)) {
        dataPath = `data/${ADMIN_UID}/${path}`;
      } else {
        dataPath = `data/${currentUserId}/${path}`;
      }
    } else { // Employee
      // Employees should only access their own user-specific data (e.g., notifications).
      // They should not attempt to read admin-only shared paths like renewals.
      if (path === 'notifications') {
         dataPath = `data/${currentUserId}/${path}`;
      }
      // For any other path an employee might try to access (e.g., tickets, renewals, customForms),
      // dataPath remains null, preventing a permission error. The hook will return empty data for those.
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

  const getWritePath = (id?: string) => {
    if (!currentUserId) throw new Error('User not authenticated');
    
    let basePath;
    // Determine the correct base path for writing.
    if (SHARED_ADMIN_PATHS.includes(path)) {
        // For shared data, all users (including admins and employees creating tickets)
        // write to the central admin path.
        basePath = `data/${ADMIN_UID}/${path}`;
    } else {
        // For user-specific data (like notifications), write to the user's own space.
        basePath = `data/${currentUserId}/${path}`;
    }
    return id ? `${basePath}/${id}` : basePath;
  }

  const add = (item: Omit<T, 'id'>): string => {
    const writePath = getWritePath();
    const dataRef = ref(database, writePath);
    const newItemRef = push(dataRef);
    set(newItemRef, item);
    return newItemRef.key!;
  };

  const update = (id: string, item: Partial<T>) => {
    const writePath = getWritePath(id);
    const itemRef = ref(database, writePath);
    const { id: _, ...rest } = item as any;
    const currentItem = data.find(d => d.id === id);
    // Use set with merge behavior to update fields
    set(itemRef, { ...currentItem, ...rest });
  };
  
  const removeById = (id: string) => {
    const writePath = getWritePath(id);
    const itemRef = ref(database, writePath);
    remove(itemRef);
  };

  return { data, loading, add, update, removeById };
}
