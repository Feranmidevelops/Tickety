import type { TicketPriority, TicketStatus } from '../lib/types';
import { statusLabel } from '../lib/format';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge badge--${status}`}>{statusLabel[status]}</span>;
}

export function PriorityTag({ priority }: { priority: TicketPriority }) {
  return <span className={`pri pri--${priority}`}>{priority}</span>;
}
