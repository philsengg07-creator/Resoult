
'use client';
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocalStorage } from './use-local-storage';
import { type Renewal, type AppNotification } from '@/types';
import { differenceInDays, isSameDay, startOfDay, format } from 'date-fns';
import { useAuth } from './use-auth';
import { sendRenewalEmail } from '@/ai/flows/send-renewal-email';

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
        const hasBeenNotifiedToday = notifications.some(
          n => n.refId === renewal.id && isSameDay(new Date(n.createdAt), today) && n.message.includes(`in ${daysLeft} day(s)`)
        );
        
        const isExpiringToday = daysLeft === 0;
        const hasBeenNotifiedForExpiry = notifications.some(
          n => n.refId === renewal.id && n.message.includes('expiring today')
        );

        let shouldNotify = false;
        if (isExpiringToday && !hasBeenNotifiedForExpiry) {
           shouldNotify = true;
        } else if (!isExpiringToday && !hasBeenNotifiedToday) {
            shouldNotify = true;
        }


        if (shouldNotify) {
          const message = daysLeft === 0
            ? `The warranty for "${renewal.itemName}" is expiring today.`
            : `The warranty for "${renewal.itemName}" is expiring in ${daysLeft} day(s).`;

          newNotifications.push({
            id: crypto.randomUUID(),
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
      setNotifications(prevNotifications => [...newNotifications, ...prevNotifications]);
      
      newNotifications.forEach(notification => {
        if (user.email) {
          const renewal = renewals.find(r => r.id === notification.refId);
          const daysLeft = differenceInDays(new Date(renewal!.renewalDate), today);
          sendRenewalEmail({
            adminEmail: user.email,
            itemName: renewal!.itemName,
            renewalDate: format(new Date(renewal!.renewalDate), 'PPP'),
            daysLeft: daysLeft,
          }).catch(console.error);
        }

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Renewal Reminder', { body: notification.message });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewals, user]); // Only re-run when renewals or user changes

  return <RenewalContext.Provider value={undefined}>{children}</RenewalContext.Provider>;
}

export function useRenewal() {
  const context = useContext(RenewalContext);
  if (context === undefined) {
    throw new Error('useRenewal must be used within a RenewalProvider');
  }
  return context;
}
