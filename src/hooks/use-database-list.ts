
'use client';
import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { useAuth } from './use-auth';

// This is the user ID for the shared space for employees.
// It matches the path in the security rules.
const EMPLOYEE_SHARED_ID = 'employee_shared';

export function useDatabaseList<T extends { id: string }>(path: string) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !firebaseUser) {
      if(!authLoading) setLoading(false);
      return;
    }
    setLoading(true);

    const isAdmin = user?.role === 'Admin';
    const adminId = firebaseUser?.uid;

    const unsubscribes: (() => void)[] = [];

    const handleData = (snapshot: any, pathPrefix: string) => {
      const val = snapshot.val();
      const list: T[] = val ? Object.keys(val).map(key => ({ ...val[key], id: key, __pathPrefix: pathPrefix } as any)) : [];
      
      setData(currentData => {
        // Filter out old data from the same path, then merge
        const otherData = currentData.filter(item => (item as any).__pathPrefix !== pathPrefix);
        return [...otherData, ...list];
      });
    };

    if (isAdmin && adminId) {
      // Admin: Listen to their own path AND the shared employee path
      setData([]); // Reset data on path change
      let adminDataLoaded = false;
      let employeeDataLoaded = false;
      const checkLoadingDone = () => {
        if(adminDataLoaded && employeeDataLoaded) {
          setLoading(false);
        }
      }

      const adminPath = `data/${adminId}/${path}`;
      const onAdminValue = onValue(ref(database, adminPath), (snapshot) => {
        handleData(snapshot, adminId);
        adminDataLoaded = true;
        checkLoadingDone();
      }, () => { adminDataLoaded = true; checkLoadingDone(); });
      unsubscribes.push(onAdminValue);
      
      const employeePath = `data/${EMPLOYEE_SHARED_ID}/${path}`;
      const onEmployeeValue = onValue(ref(database, employeePath), (snapshot) => {
        handleData(snapshot, EMPLOYEE_SHARED_ID);
        employeeDataLoaded = true;
        checkLoadingDone();
      }, () => { employeeDataLoaded = true; checkLoadingDone(); });
      unsubscribes.push(onEmployeeValue);

    } else if (!isAdmin && user) {
      // Employee: Listen only to shared path
      setData([]); // Reset data on path change
      const employeePath = `data/${EMPLOYEE_SHARED_ID}/${path}`;
      const onEmployeeValue = onValue(ref(database, employeePath), (snapshot) => {
        handleData(snapshot, EMPLOYEE_SHARED_ID);
        setLoading(false);
      }, () => setLoading(false));
      unsubscribes.push(onEmployeeValue);

    } else if (!authLoading) {
      setLoading(false);
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [path, authLoading, user, firebaseUser]);

  const add = (item: Omit<T, 'id'>): string => {
    if (!firebaseUser) throw new Error('User not authenticated');
    
    let writePath;
    if (user?.role === 'Admin') {
      writePath = `data/${firebaseUser.uid}/${path}`;
    } else {
      // Employees (anonymous or otherwise) write to the shared space
      writePath = `data/${EMPLOYEE_SHARED_ID}/${path}`;
    }
    
    const dataRef = ref(database, writePath);
    const newItemRef = push(dataRef);
    set(newItemRef, item);
    return newItemRef.key!;
  };

  const update = (id: string, item: Partial<T>) => {
    if (!firebaseUser) throw new Error('User not authenticated');
    
    const originalItem = data.find(d => d.id === id);
    if (!originalItem) throw new Error(`Item with id ${id} not found.`);

    const itemPathId = (originalItem as any)?.__pathPrefix;
    if (!itemPathId) throw new Error('Cannot determine item path for update.');
    
    const itemRef = ref(database, `data/${itemPathId}/${path}/${id}`);
    const { id: _, ...rest } = item as any;
    const currentItem = data.find(d => d.id === id);
    set(itemRef, { ...currentItem, ...rest });
  };
  
  const removeById = (id: string) => {
    if (!firebaseUser) throw new Error('User not authenticated');
    
    const originalItem = data.find(d => d.id === id);
    if (!originalItem) throw new Error(`Item with id ${id} not found.`);
    
    const itemPathId = (originalItem as any)?.__pathPrefix;
    if (!itemPathId) throw new Error('Cannot determine item path for remove.');
    
    const itemRef = ref(database, `data/${itemPathId}/${path}/${id}`);
    remove(itemRef);
  };

  return { data, loading, add, update, removeById };
}
