
'use server';
/**
 * @fileOverview A flow for sending push notifications via FCM.
 *
 * - sendPushNotification - A function that triggers the push notification sending process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PushNotificationInput, PushNotificationInputSchema } from '@/types';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if it hasn't been already.
// This is crucial for server-side operations.
// You must set the GOOGLE_APPLICATION_CREDENTIALS environment variable in your deployment
// to a service account key with permissions to send FCM messages.
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://studio-288338678-646a3-default-rtdb.asia-southeast1.firebasedatabase.app/',
  });
}

export async function sendPushNotification(input: PushNotificationInput): Promise<void> {
  await sendPushNotificationFlow(input);
}

const sendPushNotificationFlow = ai.defineFlow(
  {
    name: 'sendPushNotificationFlow',
    inputSchema: PushNotificationInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const { userId, title, body } = input;
    
    // 1. Get user's device tokens from the database
    const db = admin.database();
    const tokensSnapshot = await db.ref(`device_tokens/${userId}`).once('value');
    const tokensVal = tokensSnapshot.val();

    if (!tokensVal) {
      console.log('No device tokens found for user:', userId);
      return;
    }

    const tokens = Object.keys(tokensVal);

    if (tokens.length === 0) {
      console.log('No device tokens found for user:', userId);
      return;
    }

    // 2. Send messages to the devices
    const message = {
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
            icon: '/icons/icon-192x192.png',
        },
      },
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Successfully sent message:', response);
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
        // TODO: Clean up invalid tokens
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
);
