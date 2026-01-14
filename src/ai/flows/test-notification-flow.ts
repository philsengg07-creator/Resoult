
'use server';
/**
 * @fileOverview A flow for sending a test renewal notification.
 *
 * - sendTestNotification - A function that sends a sample email.
 * - TestNotificationOutput - The return type for the sendTestNotification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Resend } from 'resend';
import { format } from 'date-fns';

const TestNotificationOutputSchema = z.object({
  sent: z.boolean().describe('Whether an email was sent.'),
  count: z.number().describe('The number of items in the notification.'),
  to: z.string().describe('The email address the notification was sent to.'),
});
export type TestNotificationOutput = z.infer<typeof TestNotificationOutputSchema>;

export async function sendTestNotification(): Promise<TestNotificationOutput> {
  return testNotificationFlow();
}

const testNotificationFlow = ai.defineFlow(
  {
    name: 'testNotificationFlow',
    inputSchema: z.void(),
    outputSchema: TestNotificationOutputSchema,
  },
  async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const testItems = [
      {
        itemName: 'Sample Renewal 1',
        expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      },
      {
        itemName: 'Sample Renewal 2',
        expiryDate: new Date(new Date().setDate(new Date().getDate() + 10)),
      },
    ];

    const emailHtml = `
      <h1>Upcoming Renewals (Test Notification)</h1>
      <p>This is a test email. The following items are due for renewal soon:</p>
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

    const toEmail = 'philsengg07@gmail.com';

    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: toEmail,
        subject: 'Upcoming Renewal Reminder (Test)',
        html: emailHtml,
      });

      return { sent: true, count: testItems.length, to: toEmail };
    } catch (error) {
      console.error('Resend API Error:', error);
      throw new Error('Failed to send test notification email.');
    }
  }
);
