
'use client';
import { useEffect } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { useAuth } from './use-auth';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useToast } from './use-toast';

export const usePushNotifications = () => {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !messaging || user?.role !== 'Admin' || !firebaseUser) {
      return;
    }

    const requestPermission = async () => {
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

        // 1. Request permission
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          // 2. Get the token
          const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
          });

          if (currentToken) {
            // 3. Save the token to the database
            const tokenRef = ref(database, `device_tokens/${firebaseUser.uid}/${currentToken}`);
            await set(tokenRef, true);
            console.log('FCM token saved to database.');
          } else {
            console.log('No registration token available. Request permission to generate one.');
             toast({
                variant: 'destructive',
                title: 'Notification Error',
                description: 'Could not get push notification token.',
             });
          }
        } else {
             toast({
                title: 'Notification Permission Denied',
                description: 'You will not receive push notifications for new tickets.',
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
    };
    
    // Let's request permission right away if the user is an admin
    requestPermission();

  }, [user, firebaseUser, toast]);
};
