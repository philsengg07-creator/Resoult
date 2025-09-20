
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
  role: 'Admin';
  email?: string;
}

export type TrackedItemType = 'Warranty' | 'Renewal';

export interface Attachment {
    name: string;
    url: string; // base64 data URI
}

export interface TrackedItem {
  id: string;
  itemName: string;
  type: TrackedItemType;
  purchaseDate: string;
  expiryDate: string;
  amount?: number;
  vendor?: string;
  notes?: string;
  attachment?: string;
  attachmentName?: string;
}

export interface AppNotification {
    id: string;
    refId: string; // ticketId or renewalId
    type: 'renewal' | 'ticket';
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
export const CustomFormFieldTypeSchema = z.enum(['text', 'textarea', 'date', 'time', 'datetime', 'boolean', 'group', 'attachments']);
export type CustomFormFieldType = z.infer<typeof CustomFormFieldTypeSchema>;

export const CustomFormFieldSchema: z.ZodType<CustomFormField> = z.lazy(() => z.object({
  name: z.string().min(1, 'Field name is required.'),
  type: CustomFormFieldTypeSchema,
  fields: z.array(CustomFormFieldSchema).optional(),
}));

export interface CustomFormField {
    name: string;
    type: CustomFormFieldType;
    fields?: CustomFormField[];
}

export interface CustomForm {
    id: string;
    title: string;
    fields: CustomFormField[];
}

export interface FormEntry {
    id:string;
    formId: string;
    data: Record<string, any>; // The data is a record where each key is a field name and value is the encrypted field value
    notes?: string; // Encrypted notes for the entire entry
    attachments?: Attachment[];
}


// Types for Work Module
export type WorkStatus = 'Pending' | 'In Process' | 'Finished';

export interface WorkItem {
    id: string;
    description: string;
    status: WorkStatus;
    createdAt: string;
}

export interface WorkUpdate {
    id: string;
    workItemId: string;
    text: string;
    createdAt: string;
}

export interface Employee {
    id: string;
    name: string;
    email: string;
}

// Types for Sheets Module
export interface SheetDefinition {
    id: string;
    name: string;
    rows: number;
    cols: number;
}

export interface SheetCell {
    id: string;
    sheetId: string;
    row: number;
    col: number;
    value: string; // Encrypted value
}

    