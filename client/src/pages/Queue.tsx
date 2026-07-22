import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { useQueueHub } from '../realtime/signalr';
import { TicketTable } from '../components/TicketTable';
import { StatCard, StatRow } from '../components/StatCard';
import { IconTicket, IconQueue, IconCheck, IconArchive } from '../components/icons';
import type { TicketSummary } from '../lib/types';

type Filter = 'all' | 'unassigned' | 'mine';

export function Queue() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.get<TicketSummary[]>('/api/tickets'),
  });

  // Live queue: new tickets toast + refresh; updates just refresh.
  useQueueHub({
    onCreated: (t) => {
      toast.show(`New ticket #${t.id}: ${t.title}`, 'info');
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onUpdated: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });

  const filtered = useMemo(() => {
    if (filter === 'unassigned') return tickets.filter((t) => !t.assignedAgentId);
    if (filter === 'mine') return tickets.filter((t) => t.assignedAgentId === user?.id);
    return tickets;
  }, [tickets, filter, user?.id]);

  const counts = useMemo(() => ({
    all: tickets.length,
    unassigned: tickets.filter((t) => !t.assignedAgentId).length,
    mine: tickets.filter((t) => t.assignedAgentId === user?.id).length,
  }), [tickets, user?.id]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'New' || t.status === 'InProgress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
    closed: tickets.filter((t) => t.status === 'Closed').length,
  }), [tickets]);

  return (
    <>
      <div className="page">
        <StatRow>
          <StatCard label="Total Tickets" value={stats.total} tone="blue" icon={<IconTicket />} />
          <StatCard label="Open Tickets" value={stats.open} tone="amber" icon={<IconQueue />} />
          <StatCard label="Resolved Tickets" value={stats.resolved} tone="green" icon={<IconCheck />} />
          <StatCard label="Closed Tickets" value={stats.closed} tone="red" icon={<IconArchive />} />
        </StatRow>

        <div className="filterbar">
          {(['all', 'unassigned', 'mine'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`chip ${filter === f ? 'chip--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'unassigned' ? 'Unassigned' : 'Assigned to me'}
              <span className="chip__count">{counts[f]}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="page"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">✦</div>
            <div className="empty__title">Nothing in the queue</div>
            <div className="empty__body">
              {filter === 'all'
                ? 'When staff raise tickets, they’ll appear here in real time.'
                : 'No tickets match this filter right now.'}
            </div>
          </div>
        ) : (
          <TicketTable tickets={filtered} />
        )}
      </div>
    </>
  );
}
