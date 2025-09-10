
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

export interface User {
  name: string;
  role: 'Admin' | 'Employee';
}
