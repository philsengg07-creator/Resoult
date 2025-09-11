
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
  const [, setNotifications] = useLocalStorage<AppNotification[]>('notifications', []);

  useEffect(() => {
    if (user?.role !== 'Admin' || typeof window === 'undefined') return;

    const today = startOfDay(new Date());

    renewals.forEach(renewal => {
      const renewalDate = startOfDay(new Date(renewal.renewalDate));
      const daysLeft = differenceInDays(renewalDate, today);

      if (daysLeft >= 0 && NOTIFICATION_DAYS.includes(daysLeft)) {
        
        setNotifications(prevNotifications => {
            let alreadyNotified = prevNotifications.some(
              n => n.refId === renewal.id && 
                   isSameDay(new Date(n.createdAt), today) && 
                   n.message.includes(`${daysLeft} day`)
            );

            if (daysLeft === 0) {
                alreadyNotified = false;
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

                if (user.email) {
                    sendRenewalEmail({
                        adminEmail: user.email,
                        itemName: renewal.itemName,
                        renewalDate: format(new Date(renewal.renewalDate), 'PPP'),
                        daysLeft: daysLeft,
                    }).catch(console.error);
                }

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Renewal Reminder', { body: message });
                }
                return [newNotif, ...prevNotifications];
            }
            
            return prevNotifications;
        });
      }
    });
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewals, user, setNotifications]); 

  return <RenewalContext.Provider value={undefined}>{children}</RenewalContext.Provider>;
}

export function useRenewal() {
  const context = useContext(RenewalContext);
  if (context === undefined) {
    throw new Error('useRenewal must be used within a RenewalProvider');
  }
  return context;
}
