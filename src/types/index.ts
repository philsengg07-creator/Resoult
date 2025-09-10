
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
