
'use client';
import { useState, useEffect, useMemo } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { useAuth } from './use-auth';

export function useDatabaseList<T extends { id: string }>(path: string) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'Admin';
  const adminId = firebaseUser?.uid;
  const employeeId = 'employee_shared';
  
  const userId = useMemo(() => {
    if (authLoading) return null;
    return isAdmin ? adminId : employeeId;
  }, [authLoading, isAdmin, adminId]);


  useEffect(() => {
    if (authLoading) return;
    
    setLoading(true);
    let unsubscribes: (() => void)[] = [];

    const handleData = (snapshot: any, pathPrefix: string) => {
        const val = snapshot.val();
        const list: T[] = val ? Object.keys(val).map(key => ({ ...val[key], id: key, __pathPrefix: pathPrefix } as any)) : [];
        
        setData(currentData => {
            const otherData = currentData.filter(item => (item as any).__pathPrefix !== pathPrefix);
            return [...otherData, ...list];
        });
    };

    if (isAdmin && adminId) {
      // Admin: Listen to both admin and employee paths
      const adminPath = `data/${adminId}/${path}`;
      const employeePath = `data/${employeeId}/${path}`;
      
      const adminRef = ref(database, adminPath);
      const employeeRef = ref(database, employeePath);
      
      let adminDataLoaded = false;
      let employeeDataLoaded = false;

      const checkLoadingDone = () => {
        if(adminDataLoaded && employeeDataLoaded) {
            setLoading(false);
        }
      }

      const onAdminValue = onValue(adminRef, (snapshot) => {
        handleData(snapshot, adminId);
        adminDataLoaded = true;
        checkLoadingDone();
      }, () => { adminDataLoaded = true; checkLoadingDone(); });

      const onEmployeeValue = onValue(employeeRef, (snapshot) => {
        handleData(snapshot, employeeId);
        employeeDataLoaded = true;
        checkLoadingDone();
      }, () => { employeeDataLoaded = true; checkLoadingDone(); });

      unsubscribes = [onAdminValue, onEmployeeValue];
      setData([]);

    } else if (!isAdmin && user) {
      // Employee: Listen only to employee path
      const employeePath = `data/${employeeId}/${path}`;
      const employeeRef = ref(database, employeePath);
      const onEmployeeValue = onValue(employeeRef, (snapshot) => {
        handleData(snapshot, employeeId);
        setLoading(false);
      }, () => setLoading(false));
      unsubscribes = [onEmployeeValue];
      setData([]);
    } else if (!authLoading) {
      setLoading(false);
      setData([]);
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [path, authLoading, isAdmin, adminId, user]);

  const add = (item: Omit<T, 'id'>): string => {
    if (authLoading) throw new Error('Auth state still loading');
    if (!user) throw new Error('User not authenticated');
    
    // Employees write to shared, Admins write to their own
    const writeId = isAdmin ? adminId : employeeId;
    if (!writeId) {
        console.error("useDatabaseList: Cannot 'add' because writeId is not available.", {isAdmin, adminId});
        throw new Error('User ID not available for database write.');
    }
    
    const dataRef = ref(database, `data/${writeId}/${path}`);
    const newItemRef = push(dataRef);
    set(newItemRef, item);
    return newItemRef.key!;
  };

  const update = (id: string, item: Partial<T>) => {
    if (authLoading || !user) throw new Error('User not authenticated or still loading');
    
    const originalItem = data.find(d => d.id === id);
    if (!originalItem) throw new Error(`Item with id ${id} not found.`);

    // Admins can update any item, so we need to know its origin path
    const itemPathId = (originalItem as any)?.__pathPrefix;
    if (!itemPathId) {
        // Fallback for employee view or if prefix is missing
        const fallbackId = isAdmin ? adminId : employeeId;
        if(!fallbackId) throw new Error('Cannot determine item path');
        
        const itemRef = ref(database, `data/${fallbackId}/${path}/${id}`);
        const { id: _, ...rest } = item as any;
        const currentItem = data.find(d => d.id === id);
        set(itemRef, { ...currentItem, ...rest });
        return;
    };


    const itemRef = ref(database, `data/${itemPathId}/${path}/${id}`);
    const { id: _, ...rest } = item as any;
    const currentItem = data.find(d => d.id === id);
    set(itemRef, { ...currentItem, ...rest });
  };
  
  const removeById = (id: string) => {
    if (authLoading || !user) throw new Error('User not authenticated or still loading');
    
    const originalItem = data.find(d => d.id === id);
    if (!originalItem) throw new Error(`Item with id ${id} not found.`);
    
    const itemPathId = (originalItem as any)?.__pathPrefix;
     if (!itemPathId) {
        // Fallback for employee view or if prefix is missing
        const fallbackId = isAdmin ? adminId : employeeId;
        if(!fallbackId) throw new Error('Cannot determine item path');
        const itemRef = ref(database, `data/${fallbackId}/${path}/${id}`);
        remove(itemRef);
        return;
    };
    
    const itemRef = ref(database, `data/${itemPathId}/${path}/${id}`);
    remove(itemRef);
  };

  return { data, loading, add, update, removeById };
}
