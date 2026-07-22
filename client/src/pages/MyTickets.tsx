import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { TicketTable } from '../components/TicketTable';
import type { TicketSummary } from '../lib/types';

export function MyTickets() {
  const navigate = useNavigate();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.get<TicketSummary[]>('/api/tickets'),
  });

  return (
    <>
      <div className="page">
        {isLoading ? (
          <div className="page"><span className="spinner" /></div>
        ) : tickets.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">✦</div>
            <div className="empty__title">No tickets yet</div>
            <div className="empty__body">Raise your first request and track its progress here.</div>
            <button className="btn btn--primary" onClick={() => navigate('/new')}>Create ticket</button>
          </div>
        ) : (
          <TicketTable tickets={tickets} />
        )}
      </div>
    </>
  );
}
