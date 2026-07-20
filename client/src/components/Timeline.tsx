import type { TicketEvent } from '../lib/types';
import { relativeTime, statusLabel } from '../lib/format';
import './timeline.css';

function describe(e: TicketEvent): string {
  switch (e.type) {
    case 'Created': return 'raised this ticket';
    case 'Assigned':
      if (!e.note) return 'assigned the ticket';
      return e.note === e.actorName ? 'self-assigned the ticket' : `assigned it to ${e.note}`;
    case 'Reopened': return 'reopened the ticket';
    case 'StatusChanged':
      return e.fromStatus && e.toStatus
        ? `moved it from ${statusLabel[e.fromStatus]} to ${statusLabel[e.toStatus]}`
        : 'updated the status';
  }
}

const glyph: Record<TicketEvent['type'], string> = {
  Created: '✦', Assigned: '⇢', StatusChanged: '↻', Reopened: '⟲',
};

export function Timeline({ events }: { events: TicketEvent[] }) {
  return (
    <ol className="timeline">
      {events.map((e) => (
        <li key={e.id} className="timeline__item">
          <span className={`timeline__glyph timeline__glyph--${e.type}`}>{glyph[e.type]}</span>
          <div className="timeline__body">
            <span className="timeline__text">
              <strong>{e.actorName}</strong> {describe(e)}
            </span>
            <time className="timeline__time t-caption t-muted" title={new Date(e.createdAtUtc).toLocaleString()}>
              {relativeTime(e.createdAtUtc)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
