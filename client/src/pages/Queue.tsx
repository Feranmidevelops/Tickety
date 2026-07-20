import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { useQueueHub } from '../realtime/signalr';
import { TicketTable } from '../components/TicketTable';
import type { TicketSummary } from '../lib/types';

type Filter = 'all' | 'unassigned' | 'mine';

export function Queue() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
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

  return (
    <>
      <div className="subheader">
        <div className="subheader__title">
          <span className="t-title">Queue</span>
          <span className="t-caption t-muted">Live</span>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/new')}>New ticket</button>
      </div>

      <div className="page">
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
