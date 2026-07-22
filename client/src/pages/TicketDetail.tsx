import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { useTicketHub } from '../realtime/signalr';
import { StatusBadge, PriorityTag } from '../components/Badge';
import { AvatarLabel } from '../components/Avatar';
import { Timeline } from '../components/Timeline';
import { AssignControl } from '../components/AssignControl';
import { actionLabel, categoryLabel, fullDate, nextStatuses, statusLabel } from '../lib/format';
import type { TicketDetail as Ticket, TicketStatus } from '../lib/types';
import './ticketdetail.css';

export function TicketDetail() {
  const { id } = useParams();
  const ticketId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { hasRole } = useAuth();
  const isAgent = hasRole('Agent', 'Admin');
  const [busy, setBusy] = useState(false);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => api.get<Ticket>(`/api/tickets/${ticketId}`),
    enabled: !Number.isNaN(ticketId),
  });

  // Live per-ticket channel: patch the cache when anyone changes this ticket.
  useTicketHub(ticket ? ticketId : undefined, (fresh) => {
    qc.setQueryData(['ticket', ticketId], { ...fresh, events: fresh.events ?? [] });
    qc.invalidateQueries({ queryKey: ['tickets'] });
  });

  async function act(fn: () => Promise<Ticket>, successMsg: string) {
    setBusy(true);
    try {
      const updated = await fn();
      qc.setQueryData(['ticket', ticketId], updated);
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.show(successMsg, 'success');
    } catch (err) {
      toast.show((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const accept = () => act(
    () => api.post<Ticket>(`/api/tickets/${ticketId}/accept`),
    'Ticket accepted');

  const changeStatus = (status: TicketStatus) => act(
    () => api.post<Ticket>(`/api/tickets/${ticketId}/status`, { status }),
    `Moved to ${statusLabel[status]}`);

  if (isLoading) return <div className="page"><span className="spinner" /></div>;
  if (error || !ticket) return (
    <div className="page">
      <div className="empty">
        <div className="empty__icon">⚠</div>
        <div className="empty__title">Ticket unavailable</div>
        <div className="empty__body">{(error as Error)?.message ?? 'Not found.'}</div>
        <button className="btn btn--secondary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    </div>
  );

  const canAccept = isAgent && ticket.status === 'New';
  // 'New' tickets are moved forward via Accept (assign + start), so hide raw transition buttons there.
  const transitions = isAgent && ticket.status !== 'New' ? nextStatuses(ticket.status) : [];

  return (
    <div className="page page--centered td">
      <div className="td__bar">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>← Back</button>
        {isAgent && (
          <div className="td__actions">
            {canAccept && (
              <button className="btn btn--primary" onClick={accept} disabled={busy}>Accept</button>
            )}
            {transitions.map((s) => (
              <button
                key={s}
                className={`btn ${actionLabel(ticket.status, s) === 'Reopen' || s === 'Closed' ? 'btn--secondary' : 'btn--primary'}`}
                onClick={() => changeStatus(s)}
                disabled={busy}
              >
                {actionLabel(ticket.status, s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="td__grid">
        <div className="td__main">
          <div className="panel td__headcard">
            <div className="td__badges">
              <span className="t-caption t-muted">#{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <PriorityTag priority={ticket.priority} />
              <span className="td__cat">{categoryLabel[ticket.category]}</span>
            </div>
            <h1 className="t-title td__title">{ticket.title}</h1>
            <p className="td__description">{ticket.description}</p>
          </div>

          <div className="panel">
            <h2 className="t-subhead td__timeline-title">Activity</h2>
            <Timeline events={ticket.events} />
          </div>
        </div>

        <aside className="panel td__rail">
          <RailField label="Status"><StatusBadge status={ticket.status} /></RailField>
          <RailField label="Priority"><PriorityTag priority={ticket.priority} /></RailField>
          <RailField label="Category">{categoryLabel[ticket.category]}</RailField>
          <RailField label="Requester"><AvatarLabel name={ticket.requesterName} size={24} /></RailField>
          <RailField label="Assignee">
            {isAgent
              ? <AssignControl ticketId={ticket.id} currentAgentId={ticket.assignedAgentId}
                  currentAgentName={ticket.assignedAgentName} />
              : (ticket.assignedAgentName
                  ? <AvatarLabel name={ticket.assignedAgentName} size={24} />
                  : <span className="t-muted">Unassigned</span>)}
          </RailField>
          <RailField label="Created">{fullDate(ticket.createdAtUtc)}</RailField>
          <RailField label="Last updated">{fullDate(ticket.updatedAtUtc)}</RailField>
        </aside>
      </div>
    </div>
  );
}

function RailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="railfield">
      <div className="railfield__label t-caption t-muted">{label}</div>
      <div className="railfield__value">{children}</div>
    </div>
  );
}
