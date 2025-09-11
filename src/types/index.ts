
import { z } from 'zod';

export type TicketStatus = 'Unopened' | 'Open' | 'In Progress' | 'Closed';

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
