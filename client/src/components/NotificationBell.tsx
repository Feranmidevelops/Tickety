import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNotifications } from '../realtime/NotificationsContext';
import { relativeTime } from '../lib/format';
import { IconBell } from './icons';
import type { ServerNotification } from '../lib/types';
import './notificationbell.css';

interface Row {
  key: string;
  kind: string;
  message: string;
  ticketId: number;
  at: string;
  read: boolean;
}

/** Top-bar bell. Merges persisted server notifications (assignments — survive refresh/offline)
 *  with this session's live new-ticket items. Opening it marks everything read; clicking one
 *  opens that ticket. */
export function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ref = useRef<HTMLDetailsElement>(null);
  const { items: transient, unread: transientUnread, markAllRead: markTransientRead } = useNotifications();

  const { data: server = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<ServerNotification[]>('/api/notifications'),
    refetchInterval: 60_000,
  });

  const serverUnread = useMemo(() => server.filter((n) => n.readAtUtc == null).length, [server]);
  const unread = serverUnread + transientUnread;

  const rows = useMemo<Row[]>(() => {
    const s: Row[] = server.map((n) => ({
      key: `s${n.id}`, kind: n.kind, message: n.message,
      ticketId: n.ticketId, at: n.createdAtUtc, read: n.readAtUtc != null,
    }));
    const t: Row[] = transient.map((n) => ({
      key: `t${n.id}`, kind: n.kind, message: n.message,
      ticketId: n.ticketId, at: n.at, read: n.read,
    }));
    return [...s, ...t].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [server, transient]);

  async function markRead() {
    markTransientRead();
    if (serverUnread > 0) {
      try {
        await api.post('/api/notifications/read');
        qc.invalidateQueries({ queryKey: ['notifications'] });
      } catch { /* ignore */ }
    }
  }

  const open = (ticketId: number) => {
    if (ref.current) ref.current.open = false;
    navigate(`/tickets/${ticketId}`);
  };

  return (
    <details
      ref={ref}
      className="notifmenu"
      onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) markRead(); }}
    >
      <summary className="notifmenu__trigger" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
        <IconBell />
        {unread > 0 && <span className="notifmenu__badge">{unread > 9 ? '9+' : unread}</span>}
      </summary>

      <div className="notifmenu__pop">
        <div className="notifmenu__head"><span>Notifications</span></div>

        {rows.length === 0 ? (
          <div className="notifmenu__empty">You're all caught up.</div>
        ) : (
          <ul className="notifmenu__list">
            {rows.map((n) => (
              <li key={n.key}>
                <button
                  className={`notifitem ${n.read ? '' : 'notifitem--unread'}`}
                  onClick={() => open(n.ticketId)}
                >
                  <span className={`notifitem__dot notifitem__dot--${n.kind === 'assigned' ? 'assigned' : 'created'}`} />
                  <span className="notifitem__body">
                    <span className="notifitem__msg">{n.message}</span>
                    <span className="notifitem__time">{relativeTime(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
