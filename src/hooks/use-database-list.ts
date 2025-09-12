
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

  useEffect(() => {
    if (authLoading) return;
    
    setLoading(true);
    let unsubscribes: (() => void)[] = [];

    const handleData = (snapshot: any, currentData: T[]): T[] => {
        const val = snapshot.val();
        const list: T[] = val ? Object.keys(val).map(key => ({ ...val[key], id: key })) : [];
        
        // Simple merge: remove old items from this path and add new ones
        const pathPrefix = snapshot.ref.toString().includes(adminId ?? '___') ? adminId : employeeId;
        const otherData = currentData.filter(item => !(item as any).__pathPrefix || (item as any).__pathPrefix !== pathPrefix);
        const listWithPrefix = list.map(item => ({...item, __pathPrefix: pathPrefix }));

        return [...otherData, ...listWithPrefix];
    };

    if (isAdmin && adminId) {
      // Admin: Listen to both admin and employee paths
      const adminPath = `data/${adminId}/${path}`;
      const employeePath = `data/${employeeId}/${path}`;
      
      const adminRef = ref(database, adminPath);
      const employeeRef = ref(database, employeePath);

      const onAdminValue = onValue(adminRef, (snapshot) => {
        setData(current => handleData(snapshot, current));
        setLoading(false); // Consider loading done after first data received
      }, () => setLoading(false));

      const onEmployeeValue = onValue(employeeRef, (snapshot) => {
        setData(current => handleData(snapshot, current));
        setLoading(false);
      }, () => setLoading(false));

      unsubscribes = [onAdminValue, onEmployeeValue];

    } else if (!isAdmin && user) {
      // Employee: Listen only to employee path
      const employeePath = `data/${employeeId}/${path}`;
      const employeeRef = ref(database, employeePath);
      const onEmployeeValue = onValue(employeeRef, (snapshot) => {
        const val = snapshot.val();
        const list: T[] = val ? Object.keys(val).map(key => ({ ...val[key], id: key })) : [];
        setData(list);
        setLoading(false);
      }, () => setLoading(false));
      unsubscribes = [onEmployeeValue];
    } else if (!authLoading) {
      setLoading(false);
      setData([]);
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [path, authLoading, isAdmin, adminId]);

  const add = (item: Omit<T, 'id'>): string => {
    if (authLoading) throw new Error('Auth state still loading');
    if (!user) throw new Error('User not authenticated');
    
    // Employees write to shared, Admins write to their own
    const writeId = isAdmin ? adminId : employeeId;
    if (!writeId) throw new Error('User ID not available');
    
    const dataRef = ref(database, `data/${writeId}/${path}`);
    const newItemRef = push(dataRef);
    set(newItemRef, item);
    return newItemRef.key!;
  };

  const update = (id: string, item: Partial<T>) => {
    if (authLoading || !user || !adminId) throw new Error('User not authenticated or still loading');
    
    // Determine which path the item to be updated belongs to
    const originalItem = data.find(d => d.id === id);
    const itemPathId = (originalItem as any)?.__pathPrefix === employeeId ? employeeId : adminId;

    const itemRef = ref(database, `data/${itemPathId}/${path}/${id}`);
    const { id: _, ...rest } = item as any;
    const currentItem = data.find(d => d.id === id);
    set(itemRef, { ...currentItem, ...rest });
  };
  
  const removeById = (id: string) => {
    if (authLoading || !user || !adminId) throw new Error('User not authenticated or still loading');
    
    const originalItem = data.find(d => d.id === id);
    const itemPathId = (originalItem as any)?.__pathPrefix === employeeId ? employeeId : adminId;
    
    const itemRef = ref(database, `data/${itemPathId}/${path}/${id}`);
    remove(itemRef);
  };

  return { data, loading: loading, add, update, removeById };
}
