
'use client';
import { createContext, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useDatabaseList } from './use-database-list';
import { useDatabaseObject } from './use-database-object';
import { type Renewal, type AppNotification } from '@/types';
import { differenceInDays, isSameDay, startOfDay, format } from 'date-fns';
import { useAuth } from './use-auth';
import { sendRenewalEmail } from '@/ai/flows/send-renewal-email';

const RenewalContext = createContext<undefined>(undefined);

const NOTIFICATION_DAYS = [0, 1, 5, 10, 30];

export function RenewalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: renewals } = useDatabaseList<Renewal>('renewals');
  const { data: notifications, add: addNotification } = useDatabaseList<AppNotification>('notifications');
  const [lastChecked, setLastChecked] = useDatabaseObject<string | null>('renewalLastChecked', null);

  const checkRenewals = useCallback(() => {
    if (user?.role !== 'Admin' || typeof window === 'undefined') return;
    
    const today = startOfDay(new Date());

    if (lastChecked && isSameDay(new Date(lastChecked), today)) {
        return;
    }

    const newNotifications: Omit<AppNotification, 'id'>[] = [];

    renewals.forEach(renewal => {
      const renewalDate = startOfDay(new Date(renewal.renewalDate));
      const daysLeft = differenceInDays(renewalDate, today);

      if (daysLeft < 0) return;

      const shouldNotify = NOTIFICATION_DAYS.includes(daysLeft);
      
      if (shouldNotify) {
        const hasBeenNotifiedToday = notifications.some(
          n => n.refId === renewal.id && isSameDay(new Date(n.createdAt), today) && (n.message.includes(`in ${daysLeft} day(s)`) || (daysLeft === 0 && n.message.includes('expiring today')))
        );

        if (!hasBeenNotifiedToday) {
          const message = daysLeft === 0
            ? `The warranty for "${renewal.itemName}" is expiring today.`
            : `The warranty for "${renewal.itemName}" is expiring in ${daysLeft} day(s).`;

          newNotifications.push({
            refId: renewal.id,
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
          const renewal = renewals.find(r => r.id === notification.refId);
          if(renewal){
             const daysLeft = differenceInDays(new Date(renewal.renewalDate), today);
             sendRenewalEmail({
                adminEmail: user.email,
                itemName: renewal.itemName,
                renewalDate: format(new Date(renewal.renewalDate), 'PPP'),
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
    // Run once on mount and then rely on interval
    checkRenewals();

    // Check every hour
    const interval = setInterval(() => {
        checkRenewals();
    }, 1000 * 60 * 60);

    return () => clearInterval(interval);
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
