
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
        // 1. Request permission
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          // 2. Get the token
          const currentToken = await getToken(messaging, {
            vapidKey: 'BDS_xUP1CjIaC7T2fEODg5z_jLhUeYwXn-8L-KjJt6m2b-rV1q_X8sUjW0o_w-A5Q1Z1_Y4B6H_p3c', // Replace with your VAPID key
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

    // Optional: Handle token refresh
    const unsubscribe = messaging.onTokenRefresh(async () => {
        try {
            const refreshedToken = await getToken(messaging, {
                vapidKey: 'BDS_xUP1CjIaC7T2fEODg5z_jLhUeYwXn-8L-KjJt6m2b-rV1q_X8sUjW0o_w-A5Q1Z1_Y4B6H_p3c',
            });
            if (refreshedToken) {
                const tokenRef = ref(database, `device_tokens/${firebaseUser.uid}/${refreshedToken}`);
                await set(tokenRef, true);
                console.log('FCM token refreshed and saved.');
            }
        } catch (error) {
            console.error('Unable to retrieve refreshed token ', error);
        }
    });

    return () => {
        // This is not a standard unsubscribe function, but it's how you remove the listener in Firebase v9
        // messaging.onTokenRefresh returns a function to unsubscribe, but the types might not show it.
        // We can leave it empty if needed, as it might not be critical for this app's lifecycle.
    };

  }, [user, firebaseUser, toast]);
};
