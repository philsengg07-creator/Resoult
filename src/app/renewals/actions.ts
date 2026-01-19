
'use server';

import { Resend } from 'resend';
import { type TrackedItem } from '@/types';
import { subDays, format } from 'date-fns';
import { adminDatabase } from '@/lib/firebase-admin';
import { ref, update } from 'firebase/database';

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'delivered@resend.dev';

export async function scheduleRenewalNotifications(item: TrackedItem) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key is not configured. Skipping email scheduling.');
    return;
  }
  
  const expiryDate = new Date(item.expiryDate);
  const notificationDate30 = subDays(expiryDate, 30);
  const notificationDate10 = subDays(expiryDate, 10);

  const now = new Date();
  const updates: { scheduledEmailId30?: string; scheduledEmailId10?: string } = {};

  // Cancel old emails if they exist, to prevent duplicate notifications on update
  if (item.scheduledEmailId30) {
    try {
      await resend.emails.cancel(item.scheduledEmailId30);
    } catch (e) {
      console.warn(`Failed to cancel 30-day email ${item.scheduledEmailId30}`, e);
    }
  }
  if (item.scheduledEmailId10) {
    try {
      await resend.emails.cancel(item.scheduledEmailId10);
    } catch (e) {
      console.warn(`Failed to cancel 10-day email ${item.scheduledEmailId10}`, e);
    }
  }

  // --- Schedule new emails ---

  // Schedule 30-day notification
  if (notificationDate30 > now) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: NOTIFY_EMAIL,
        subject: `30-Day Renewal Reminder: ${item.itemName}`,
        html: `<p>This is a reminder that your item "<strong>${item.itemName}</strong>" is set to expire in 30 days on ${format(expiryDate, 'PPP')}.</p>`,
        scheduledAt: notificationDate30,
      });
      if (data) updates.scheduledEmailId30 = data.id;
      if (error) console.error('Resend 30-day scheduling error:', error);
    } catch(e) {
      console.error('Failed to schedule 30-day email', e);
    }
  } else {
    updates.scheduledEmailId30 = ''; // Clear it if date is in the past
  }

  // Schedule 10-day notification
  if (notificationDate10 > now) {
    try {
       const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: NOTIFY_EMAIL,
        subject: `10-Day Renewal Reminder: ${item.itemName}`,
        html: `<p>This is a reminder that your item "<strong>${item.itemName}</strong>" is set to expire in 10 days on ${format(expiryDate, 'PPP')}.</p>`,
        scheduledAt: notificationDate10,
      });
       if (data) updates.scheduledEmailId10 = data.id;
       if (error) console.error('Resend 10-day scheduling error:', error);
    } catch(e) {
        console.error('Failed to schedule 10-day email', e);
    }
  } else {
    updates.scheduledEmailId10 = ''; // Clear it if date is in the past
  }

  // Save the new scheduled email IDs back to the database
  if (Object.keys(updates).length > 0) {
    try {
      const itemRef = ref(adminDatabase, `data/renewals/${item.id}`);
      await update(itemRef, updates);
    } catch(e) {
      console.error(`Failed to update renewal item ${item.id} with scheduled email IDs.`, e);
    }
  }
}
