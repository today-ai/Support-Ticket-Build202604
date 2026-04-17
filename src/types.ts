import { Timestamp } from './firebase';

export type TicketStatus = 'open' | 'in-process' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  creatorId: string;
  creatorName: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt?: Timestamp;
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}
