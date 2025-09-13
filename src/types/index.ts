
import { z } from 'zod';

export type TicketStatus = 'Unopened' | 'Open' | 'In Progress' | 'Closed';

// When using Firebase, ID is the key of the object and not part of the object itself.
// But we add it to the type for client-side convenience.
export interface Ticket {
  id: string;
  name: string;
  problemDescription: string;
  additionalInfo?: string;
  photo?: string; // base64 data URI
  createdAt: string;
  status: TicketStatus;
  summary: string;
}

export interface User {
  name: string;
  role: 'Admin' | 'Employee';
  email?: string;
}

export interface Renewal {
  id: string;
  itemName: string;
  purchaseDate: string;
  renewalDate: string;
  notes?: string;
}

export interface AppNotification {
    id: string;
    refId: string; // ticketId or renewalId
    type: 'ticket' | 'renewal';
    message: string;
    createdAt: string;
    read: boolean;
}

export const SendRenewalEmailInputSchema = z.object({
  adminEmail: z.string().email().describe('The email address of the administrator.'),
  itemName: z.string().describe('The name of the item nearing its renewal date.'),
  renewalDate: z.string().describe('The renewal date of the item.'),
  daysLeft: z.number().int().describe('The number of days left until renewal.'),
});
export type SendRenewalEmailInput = z.infer<typeof SendRenewalEmailInputSchema>;


export const PushNotificationInputSchema = z.object({
  title: z.string().describe('The title of the push notification.'),
  body: z.string().describe('The body content of the push notification.'),
});
export type PushNotificationInput = z.infer<typeof PushNotificationInputSchema>;


// Types for Custom Encrypted Forms
export interface CustomFormField {
    name: string;
    type: 'text' | 'textarea';
}

export interface CustomForm {
    id: string;
    title: string;
    fields: CustomFormField[];
}

export interface FormEntry {
    id: string;
    formId: string;
    data: Record<string, string>; // Encrypted key-value pairs
}
