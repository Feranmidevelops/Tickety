import { useNavigate } from 'react-router-dom';
import type { TicketSummary } from '../lib/types';
import { categoryLabel, relativeTime } from '../lib/format';
import { PriorityTag, StatusBadge } from './Badge';
import './tickettable.css';

export function TicketTable({ tickets }: { tickets: TicketSummary[] }) {
  const navigate = useNavigate();
  return (
    <div className="ttable" role="table">
      <div className="ttable__head" role="row">
        <span>Priority</span>
        <span>ID</span>
        <span>Subject</span>
        <span>Status</span>
        <span>Requester</span>
        <span>Assignee</span>
        <span className="ttable__age">Age</span>
      </div>
      {tickets.map((t) => (
        <div
          key={t.id}
          role="row"
          tabIndex={0}
          className="ttable__row"
          onClick={() => navigate(`/tickets/${t.id}`)}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/tickets/${t.id}`); }}
        >
          <PriorityTag priority={t.priority} />
          <span className="ttable__id">#{t.id}</span>
          <span className="ttable__subject">
            {t.title}
            <span className="ttable__cat t-caption t-muted">{categoryLabel[t.category]}</span>
          </span>
          <StatusBadge status={t.status} />
          <span className="ttable__cell t-secondary">{t.requesterName}</span>
          <span className="ttable__cell t-secondary">
            {t.assignedAgentName ?? <span className="t-muted">Unassigned</span>}
          </span>
          <span className="ttable__age t-muted">{relativeTime(t.createdAtUtc)}</span>
        </div>
      ))}
    </div>
  );
}
