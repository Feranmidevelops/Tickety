import type { TicketCategory, TicketStatus } from './types';

export const statusLabel: Record<TicketStatus, string> = {
  New: 'New',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

export const categoryLabel: Record<TicketCategory, string> = {
  Hardware: 'Hardware',
  Network: 'Network',
  Software: 'Software',
  AccessRequest: 'Access Request',
};

/** Valid next statuses an agent can move a ticket to (mirrors the server state machine). */
export function nextStatuses(current: TicketStatus): TicketStatus[] {
  switch (current) {
    case 'New': return ['InProgress'];
    case 'InProgress': return ['Resolved', 'Closed'];
    case 'Resolved': return ['Closed', 'InProgress'];
    case 'Closed': return ['InProgress'];
  }
}

export function actionLabel(from: TicketStatus, to: TicketStatus): string {
  if ((from === 'Resolved' || from === 'Closed') && to === 'InProgress') return 'Reopen';
  if (to === 'InProgress') return 'Start progress';
  if (to === 'Resolved') return 'Mark resolved';
  if (to === 'Closed') return 'Close ticket';
  return statusLabel[to];
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

/** Compact numeric date, e.g. 22/07/2026 — used in table columns. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
