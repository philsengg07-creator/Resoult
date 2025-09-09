export type TicketStatus = 'Open' | 'In Progress' | 'Closed';

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

export interface Bill {
  id: string;
  date: string;
  description: string;
  file?: string; // base64 data URI
  createdAt: string;
}

export interface User {
  name: string;
  role: 'Admin' | 'Employee';
}
