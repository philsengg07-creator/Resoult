
'use client';
import { createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useDatabaseList } from './use-database-list';
import { useDatabaseObject } from './use-database-object';
import { type TrackedItem, type AppNotification } from '@/types';
import { differenceInDays, isSameDay, startOfDay, format } from 'date-fns';
import { useAuth } from './use-auth';
import { sendRenewalEmail } from '@/ai/flows/send-renewal-email';

const RenewalContext = createContext<undefined>(undefined);

const NOTIFICATION_DAYS = [0, 1, 5, 10, 30];

export function RenewalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: renewals } = useDatabaseList<TrackedItem>('renewals');
  const { data: notifications, add: addNotification } = useDatabaseList<AppNotification>('notifications');
  const [lastChecked, setLastChecked] = useDatabaseObject<string | null>('renewalLastChecked', null);

  const checkRenewals = useCallback(() => {
    if (user?.role !== 'Admin' || typeof window === 'undefined') return;
    
    const today = startOfDay(new Date());

    if (lastChecked && isSameDay(new Date(lastChecked), today)) {
        return;
    }

    const newNotifications: Omit<AppNotification, 'id'>[] = [];

    renewals.forEach(item => {
      const expiryDate = startOfDay(new Date(item.expiryDate));
      const daysLeft = differenceInDays(expiryDate, today);

      if (daysLeft < 0) return;

      const shouldNotify = NOTIFICATION_DAYS.includes(daysLeft);
      
      if (shouldNotify) {
        const hasBeenNotifiedToday = notifications.some(
          n => n.refId === item.id && isSameDay(new Date(n.createdAt), today) && (n.message.includes(`in ${daysLeft} day(s)`) || (daysLeft === 0 && n.message.includes('expiring today')))
        );

        if (!hasBeenNotifiedToday) {
          const typeString = item.type.toLowerCase();
          const message = daysLeft === 0
            ? `The ${typeString} for "${item.itemName}" is expiring today.`
            : `The ${typeString} for "${item.itemName}" is expiring in ${daysLeft} day(s).`;

          newNotifications.push({
            refId: item.id,
            type: 'renewal',
            message,
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      }
    });

    if (newNotifications.length > 0) {
      newNotifications.forEach(notification => {
        addNotification(notification);
        
        if (user.email) {
          const item = renewals.find(r => r.id === notification.refId);
          if(item){
             const daysLeft = differenceInDays(new Date(item.expiryDate), today);
             sendRenewalEmail({
                adminEmail: user.email,
                itemName: item.itemName,
                renewalDate: format(new Date(item.expiryDate), 'PPP'),
                daysLeft: daysLeft,
             }).catch(console.error);
          }
        }

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Renewal Reminder', { body: notification.message });
        }
      });
    }
    setLastChecked(today.toISOString());
  }, [user, renewals, notifications, addNotification, lastChecked, setLastChecked]);


  useEffect(() => {
    // Run once on mount to check for renewals immediately.
    // Subsequent checks should be triggered by a scheduled job hitting the /api/process-renewals endpoint.
    checkRenewals();
  }, [checkRenewals]);

  return <RenewalContext.Provider value={undefined}>{children}</RenewalContext.Provider>;
}

export function useRenewal() {
  const context = useContext(RenewalContext);
  if (context === undefined) {
    throw new Error('useRenewal must be used within a RenewalProvider');
  }
  return context;
}
