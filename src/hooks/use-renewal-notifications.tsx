
'use client';
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocalStorage } from './use-local-storage';
import { type Renewal, type AppNotification } from '@/types';
import { differenceInDays, isSameDay, startOfDay } from 'date-fns';
import { useAuth } from './use-auth';

const RenewalContext = createContext<undefined>(undefined);

const NOTIFICATION_DAYS = [0, 1, 5, 10, 30];

export function RenewalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [renewals] = useLocalStorage<Renewal[]>('renewals', []);
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('notifications', []);

  useEffect(() => {
    if (user?.role !== 'Admin' || typeof window === 'undefined') return;

    const today = startOfDay(new Date());
    const newNotifications: AppNotification[] = [];

    renewals.forEach(renewal => {
      const renewalDate = startOfDay(new Date(renewal.renewalDate));
      const daysLeft = differenceInDays(renewalDate, today);

      if (daysLeft >= 0 && NOTIFICATION_DAYS.includes(daysLeft)) {
        
        let alreadyNotified = false;
        // For the last day, we want to keep reminding, so we don't check if already notified.
        if (daysLeft > 0) {
            alreadyNotified = notifications.some(
              n => n.refId === renewal.id && 
                   isSameDay(new Date(n.createdAt), today) && 
                   n.message.includes(`${daysLeft} day`)
            );
        }
        
        if (!alreadyNotified) {
            const message = daysLeft === 0 
                ? `The warranty for "${renewal.itemName}" is expiring today.`
                : `The warranty for "${renewal.itemName}" is expiring in ${daysLeft} day(s).`;

            const newNotif: AppNotification = {
              id: crypto.randomUUID(),
              refId: renewal.id,
              type: 'renewal',
              message,
              createdAt: new Date().toISOString(),
              read: false,
            };
            newNotifications.push(newNotif);

            // Trigger desktop notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Renewal Reminder', { body: message });
            }
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev]);
    }
    
  }, [renewals, user, setNotifications]); // Rerun when renewals or user change

  return <RenewalContext.Provider value={undefined}>{children}</RenewalContext.Provider>;
}

export function useRenewal() {
  const context = useContext(RenewalContext);
  if (context === undefined) {
    throw new Error('useRenewal must be used within a RenewalProvider');
  }
  return context;
}
