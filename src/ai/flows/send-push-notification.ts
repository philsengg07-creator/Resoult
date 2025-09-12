
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
if (!admin.apps.length) {
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
    const { title, body } = input;
    const db = admin.database();
    
    // Hardcoded Admin UID provided by the user
    const adminUids = ['Pb2Pgfb4EiXMGLrNV1y24i3qa6C3'];

    if (adminUids.length === 0) {
      console.log('No admin users configured to send notifications to.');
      return;
    }

    // 2. For each admin, get their device tokens
    const allTokens: string[] = [];
    for (const uid of adminUids) {
      const tokensSnapshot = await db.ref(`device_tokens/${uid}`).once('value');
      const tokensVal = tokensSnapshot.val();
      if (tokensVal) {
        const userTokens = Object.keys(tokensVal);
        console.log(`Found tokens for admin ${uid}:`, userTokens);
        allTokens.push(...userTokens);
      } else {
        console.log(`No device tokens found for admin ${uid}.`);
      }
    }
    
    const uniqueTokens = [...new Set(allTokens)];

    if (uniqueTokens.length === 0) {
      console.log('No device tokens found for any admin users.');
      return;
    }

    // 3. Send messages to the devices
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
      tokens: uniqueTokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Successfully sent message:', response);
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(uniqueTokens[idx]);
          }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
);
