
'use server';

import { Resend } from 'resend';
import { type TrackedItem } from '@/types';
import { subDays, format, isFuture } from 'date-fns';
import { adminDatabase } from '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'philsengg07@gmail.com';

// Helper function to safely cancel an email
async function cancelEmail(emailId: string | null | undefined, reason: string): Promise<void> {
  if (!emailId) return;
  try {
    await resend.emails.cancel(emailId);
    console.log(`Successfully cancelled ${reason} email: ${emailId}`);
  } catch (e) {
    // It's often okay if cancellation fails (e.g., email already sent or cancelled).
    console.warn(`Could not cancel ${reason} email ${emailId}:`, e);
  }
}

export async function scheduleRenewalNotifications(item: TrackedItem): Promise<void> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key') {
    console.error('Resend API key is not configured. Skipping email scheduling.');
    return;
  }

  const expiryDate = new Date(item.expiryDate);
  const operations: Promise<any>[] = [];

  // --- Cancellation Operations ---
  operations.push(cancelEmail(item.scheduledEmailId30, '30-day'));
  operations.push(cancelEmail(item.scheduledEmailId10, '10-day'));
  
  // Wait for cancellations to finish before scheduling new ones.
  await Promise.allSettled(operations);
  
  const schedulingPromises: Promise<{ type: '30-day' | '10-day'; id: string | null }>[] = [];

  // --- Scheduling Operations ---
  const notificationDate30 = subDays(expiryDate, 30);
  if (isFuture(notificationDate30)) {
    schedulingPromises.push(
      resend.emails.send({
        from: 'onboarding@resend.dev',
        to: NOTIFY_EMAIL,
        subject: `30-Day Renewal Reminder: ${item.itemName}`,
        html: `<p>This is a reminder that your item "<strong>${item.itemName}</strong>" is set to expire in 30 days on ${format(expiryDate, 'PPP')}.</p>`,
        scheduledAt: notificationDate30.toISOString(),
      }).then(({ data, error }) => {
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
    schedulingPromises.push(
      resend.emails.send({
        from: 'onboarding@resend.dev',
        to: NOTIFY_EMAIL,
        subject: `10-Day Renewal Reminder: ${item.itemName}`,
        html: `<p>This is a reminder that your item "<strong>${item.itemName}</strong>" is set to expire in 10 days on ${format(expiryDate, 'PPP')}.</p>`,
        scheduledAt: notificationDate10.toISOString(),
      }).then(({ data, error }) => {
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
      const itemRef = adminDatabase.ref(`data/renewals/${item.id}`);
      await itemRef.update(updates);
      console.log(`Updated scheduled email IDs for item ${item.id}`);
    } catch (e) {
      console.error(`Failed to update renewal item ${item.id} with scheduled email IDs.`, e);
      // We don't re-throw here to avoid blocking the client.
    }
  }
}
