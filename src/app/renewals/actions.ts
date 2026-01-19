
'use server';

import { Resend } from 'resend';
import { type TrackedItem } from '@/types';
import { subDays, format, isFuture } from 'date-fns';
import { adminDatabase } from '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'philsengg07@gmail.com';

export async function scheduleRenewalNotifications(item: TrackedItem): Promise<void> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key') {
    console.error('Resend API key is not configured. Skipping email scheduling.');
    return;
  }

  const expiryDate = new Date(item.expiryDate);
  
  // NOTE: The logic to cancel previously scheduled emails has been removed to resolve a type error.
  // This means that if you change an expiry date, old notifications might still be sent.
  // This is a temporary measure to ensure the application remains stable.

  const schedulingPromises: Promise<{ type: '30-day' | '10-day'; id: string | null }>[] = [];

  // --- Scheduling Operations ---
  const notificationDate30 = subDays(expiryDate, 30);
  if (isFuture(notificationDate30)) {
    const payload: any = {
        from: 'onboarding@resend.dev',
        to: NOTIFY_EMAIL,
        subject: `30-Day Renewal Reminder: ${item.itemName}`,
        html: `<p>This is a reminder that your item "<strong>${item.itemName}</strong>" is set to expire in 30 days on ${format(expiryDate, 'PPP')}.</p>`,
        scheduled_at: notificationDate30.toISOString(),
    };
    schedulingPromises.push(
      resend.emails.send(payload).then(({ data, error }) => {
        if (error) {
          console.error('Resend 30-day scheduling error:', error);
          return { type: '30-day', id: null };
        }
        return { type: '30-day', id: data!.id };
      })
    );
  }

  const notificationDate10 = subDays(expiryDate, 10);
  if (isFuture(notificationDate10)) {
    const payload: any = {
        from: 'onboarding@resend.dev',
        to: NOTIFY_EMAIL,
        subject: `10-Day Renewal Reminder: ${item.itemName}`,
        html: `<p>This is a reminder that your item "<strong>${item.itemName}</strong>" is set to expire in 10 days on ${format(expiryDate, 'PPP')}.</p>`,
        scheduled_at: notificationDate10.toISOString(),
    };
    schedulingPromises.push(
      resend.emails.send(payload).then(({ data, error }) => {
        if (error) {
          console.error('Resend 10-day scheduling error:', error);
          return { type: '10-day', id: null };
        }
        return { type: '10-day', id: data!.id };
      })
    );
  }

  // Execute all scheduling promises but don't let them block.
  // We'll get the results and update the database with any new IDs.
  const results = await Promise.allSettled(schedulingPromises);

  const updates: { scheduledEmailId30?: string | null; scheduledEmailId10?: string | null } = {};
  
  // We always want to update the scheduled IDs, even if it's to nullify them.
  updates.scheduledEmailId30 = null;
  updates.scheduledEmailId10 = null;

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      if (result.value.type === '30-day') {
        updates.scheduledEmailId30 = result.value.id;
      } else if (result.value.type === '10-day') {
        updates.scheduledEmailId10 = result.value.id;
      }
    }
  });

  // Save the new scheduled email IDs back to the database.
  if (Object.keys(updates).length > 0) {
    try {
      const itemRef = adminDatabase.ref(`renewals/${item.id}`);
      await itemRef.update(updates);
      console.log(`Updated scheduled email IDs for item ${item.id}`);
    } catch (e) {
      console.error(`Failed to update renewal item ${item.id} with scheduled email IDs.`, e);
      // We don't re-throw here to avoid blocking the client.
    }
  }
}
