
'use server';
/**
 * @fileOverview THIS FILE IS OBSOLETE AND NO LONGER USED.
 * Email scheduling is now handled by `src/app/renewals/actions.ts` which uses Resend's native scheduling API.
 * This file is kept for historical purposes and can be safely deleted.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const RenewalNotificationOutputSchema = z.object({
  sent: z.boolean().describe('Whether an email was sent.'),
  count: z.number().describe('The number of items in the notification.'),
});
export type RenewalNotificationOutput = z.infer<typeof RenewalNotificationOutputSchema>;

/**
 * This function is obsolete and does nothing.
 */
export async function sendRenewalNotifications(): Promise<RenewalNotificationOutput> {
  console.warn("OBSOLETE: `sendRenewalNotifications` was called, but this notification system is no longer in use.");
  return Promise.resolve({ sent: false, count: 0 });
}

/**
 * This Genkit flow is obsolete and no longer active. The trigger has been removed
 * to prevent it from running. Email scheduling is now handled directly via server
 * actions when a renewal item is created or updated.
 */
const renewalNotificationFlow = ai.defineFlow(
  {
    name: 'renewalNotificationFlow',
    inputSchema: z.void(),
    outputSchema: RenewalNotificationOutputSchema,
    // TRIGGER REMOVED TO PREVENT EXECUTION
  },
  async () => {
    console.warn(`[${new Date().toISOString()}] OBSOLETE: Renewal notification flow was triggered but is no longer active.`);
    return { sent: false, count: 0 };
  }
);
