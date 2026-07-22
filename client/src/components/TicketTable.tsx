import { useNavigate } from 'react-router-dom';
import type { TicketSummary } from '../lib/types';
import { categoryLabel, shortDate } from '../lib/format';
import { PriorityTag, StatusBadge } from './Badge';
import { Avatar, AvatarLabel } from './Avatar';
import { IconKebab, IconEye } from './icons';
import './tickettable.css';

export function TicketTable({ tickets }: { tickets: TicketSummary[] }) {
  const navigate = useNavigate();
  const open = (id: number) => navigate(`/tickets/${id}`);

  return (
    <div className="card ttable">
      <div className="ttable__head" role="row">
        <span>ID</span>
        <span>Request by</span>
        <span>Subject</span>
        <span className="ttable__center">Assignee</span>
        <span>Priority</span>
        <span>Status</span>
        <span>Created</span>
        <span>Updated</span>
        <span className="ttable__center">Action</span>
      </div>

      {tickets.map((t) => (
        <div key={t.id} role="row" tabIndex={0} className="ttable__row"
          onClick={() => open(t.id)}
          onKeyDown={(e) => { if (e.key === 'Enter') open(t.id); }}>
          <span className="ttable__id">#{t.id}</span>
          <AvatarLabel name={t.requesterName} />
          <span className="ttable__subject">
            <span className="ttable__subjtitle">{t.title}</span>
            <span className="ttable__cat">{categoryLabel[t.category]}</span>
          </span>
          <span className="ttable__center">
            {t.assignedAgentName
              ? <Avatar name={t.assignedAgentName} size={28} />
              : <span className="t-muted">—</span>}
          </span>
          <PriorityTag priority={t.priority} />
          <StatusBadge status={t.status} />
          <span className="ttable__date">{shortDate(t.createdAtUtc)}</span>
          <span className="ttable__date">{shortDate(t.updatedAtUtc)}</span>
          <span className="ttable__center" onClick={(e) => e.stopPropagation()}>
            <details className="rowmenu">
              <summary className="rowmenu__trigger" aria-label="Actions"><IconKebab /></summary>
              <div className="rowmenu__pop">
                <button className="rowmenu__item" onClick={() => open(t.id)}>
                  <IconEye width={15} height={15} /> View details
                </button>
              </div>
            </details>
          </span>
        </div>
      ))}
    </div>
  );
}
