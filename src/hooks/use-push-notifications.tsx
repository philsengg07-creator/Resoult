
'use client';
import { useEffect, useState, useCallback } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { useAuth } from './use-auth';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useToast } from './use-toast';

export const usePushNotifications = () => {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);

  useEffect(() => {
     if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionStatus(Notification.permission);
     }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !messaging || user?.role !== 'Admin' || !firebaseUser) {
      return;
    }

    try {
      if (!process.env.NEXT_PUBLIC_VAPID_KEY) {
          console.error('VAPID key is not set in environment variables.');
          toast({
              variant: 'destructive',
              title: 'Push Notification Error',
              description: 'Application is not configured for push notifications.',
          });
          return;
      }
      
      const currentPermission = Notification.permission;
      if (currentPermission === 'denied') {
          toast({
              title: 'Notification Permission Required',
              description: "You have previously blocked notifications. Please enable them in your browser's site settings.",
              variant: 'destructive'
          });
          return;
      }

      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
        });

        if (currentToken) {
          const tokenRef = ref(database, `device_tokens/${firebaseUser.uid}/${currentToken}`);
          await set(tokenRef, true);
          console.log('FCM token saved to database.');
          toast({
              title: 'Notifications Enabled',
              description: 'You will now receive notifications for new tickets.',
          });
        } else {
          console.log('No registration token available. Request permission to generate one.');
           toast({
              variant: 'destructive',
              title: 'Notification Error',
              description: 'Could not get push notification token. Try again or check browser settings.',
           });
        }
      } else {
           toast({
              title: 'Notification Permission Denied',
              description: 'You will not receive push notifications for new tickets.',
              variant: 'destructive'
           });
      }
    } catch (error) {
      console.error('An error occurred while retrieving token. ', error);
      toast({
          variant: 'destructive',
          title: 'Push Notification Error',
          description: 'An error occurred while setting up push notifications.',
      });
    }
  }, [user, firebaseUser, toast]);
  
  return { requestPermission, permissionStatus };
};
