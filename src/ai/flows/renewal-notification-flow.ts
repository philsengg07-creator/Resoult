
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
            cron: '* * * * *', // Runs every minute for testing
            timeZone: 'UTC',
        },
    },
  },
  async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled test notification...`);

    const resend = new Resend(process.env.RESEND_API_KEY);

    const testItems = [
      {
        itemName: 'Automated Test Renewal 1',
        expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      },
      {
        itemName: 'Automated Test Renewal 2',
        expiryDate: new Date(new Date().setDate(new Date().getDate() + 10)),
      },
    ];

    const emailHtml = `
      <h1>Upcoming Renewals (Automated Test)</h1>
      <p>This is an automated test email to verify the scheduled flow.</p>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Expiry Date</th>
            <th>Days Left</th>
          </tr>
        </thead>
        <tbody>
          ${testItems
            .map(
              item => `
            <tr>
              <td>${item.itemName}</td>
              <td>${format(item.expiryDate, 'PPP')}</td>
              <td>${Math.round((item.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}</td>
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
        subject: 'Upcoming Renewal Reminder (Automated Test)',
        html: emailHtml,
      });
      console.log('Successfully sent automated test notification email.');
      return { sent: true, count: testItems.length };
    } catch (error) {
      console.error('Resend API Error:', error);
      throw new Error('Failed to send automated test notification email.');
    }
  }
);
