export type Role = 'Requester' | 'Agent' | 'Admin';
export type TicketStatus = 'New' | 'InProgress' | 'Resolved' | 'Closed';
export type TicketCategory = 'Hardware' | 'Network' | 'Software' | 'AccessRequest';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketEventType = 'Created' | 'StatusChanged' | 'Assigned' | 'Reopened';

export interface User { id: string; email: string; displayName: string; role: Role; }
export interface AuthResponse { token: string; expiresAtUtc: string; user: User; }

export interface TicketSummary {
  id: number;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  requesterName: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface TicketEvent {
  id: number;
  type: TicketEventType;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  actorId: string;
  actorName: string;
  note: string | null;
  createdAtUtc: string;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  events: TicketEvent[];
}

export interface Agent { id: string; displayName: string; email: string; }

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export interface InviteInfo { email: string; role: Role; }
export interface InviteCreated {
  token: string; acceptUrl: string; email: string; role: Role; expiresAtUtc: string; emailed: boolean;
}
