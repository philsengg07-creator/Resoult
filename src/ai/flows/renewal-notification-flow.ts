
'use server';
/**
 * @fileOverview A flow for sending renewal notifications.
 *
 * - sendRenewalNotifications - A function that checks for expiring renewals and sends an email.
 * - RenewalNotificationOutput - The return type for the sendRenewalNotifications function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Resend } from 'resend';
import { adminDatabase } from '@/lib/firebase-admin';
import { type TrackedItem } from '@/types';
import { differenceInDays, format } from 'date-fns';

const ADMIN_UID = 'Pb2Pgfb4EiXMGLrNV1y24i3qa6C3';

const RenewalNotificationOutputSchema = z.object({
  sent: z.boolean().describe('Whether an email was sent.'),
  count: z.number().describe('The number of items in the notification.'),
});
export type RenewalNotificationOutput = z.infer<typeof RenewalNotificationOutputSchema>;

export async function sendRenewalNotifications(): Promise<RenewalNotificationOutput> {
  return renewalNotificationFlow();
}

const renewalNotificationFlow = ai.defineFlow(
  {
    name: 'renewalNotificationFlow',
    inputSchema: z.void(),
    outputSchema: RenewalNotificationOutputSchema,
    trigger: {
        schedule: {
            cron: '*/5 * * * *', // Runs every 5 minutes for testing
            timeZone: 'UTC',
        },
    },
  },
  async () => {
    console.log(`[${new Date().toISOString()}] Running renewal notification check...`);

    const renewalsRef = adminDatabase.ref(`data/${ADMIN_UID}/renewals`);
    const snapshot = await renewalsRef.once('value');
    const renewalsData = snapshot.val();

    if (!renewalsData) {
      console.log('No renewal data found. Skipping notification.');
      return { sent: false, count: 0 };
    }

    const allItems: TrackedItem[] = Object.keys(renewalsData).map(key => ({
        ...renewalsData[key],
        id: key
    }));

    const itemsToNotify = allItems.filter(item => {
        try {
            const daysLeft = differenceInDays(new Date(item.expiryDate), new Date());
            // Notify on 30 days and 10 days remaining
            return daysLeft === 30 || daysLeft === 10;
        } catch (e) {
            console.error(`Invalid date for item ${item.itemName} (${item.id})`);
            return false;
        }
    });

    if (itemsToNotify.length === 0) {
      console.log('No items due for notification today. Skipping email.');
      return { sent: false, count: 0 };
    }

    console.log(`Found ${itemsToNotify.length} items to notify. Sending email...`);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailHtml = `
      <h1>Upcoming Renewals</h1>
      <p>The following items are due for renewal soon:</p>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Expiry Date</th>
            <th>Days Left</th>
          </tr>
        </thead>
        <tbody>
          ${itemsToNotify
            .map(
              item => `
            <tr>
              <td>${item.itemName}</td>
              <td>${format(new Date(item.expiryDate), 'PPP')}</td>
              <td>${differenceInDays(new Date(item.expiryDate), new Date())}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'philsengg07@gmail.com',
        subject: 'Upcoming Renewal Reminder',
        html: emailHtml,
      });
      console.log('Successfully sent notification email.');
      return { sent: true, count: itemsToNotify.length };
    } catch (error) {
      console.error('Resend API Error:', error);
      throw new Error('Failed to send notification email.');
    }
  }
);
