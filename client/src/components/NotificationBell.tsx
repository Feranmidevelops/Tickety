import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../realtime/NotificationsContext';
import { relativeTime } from '../lib/format';
import { IconBell } from './icons';
import './notificationbell.css';

/** Top-bar bell: shows an unread badge, and a dropdown of recent queue notifications.
 *  Opening it marks everything read; clicking one opens that ticket. */
export function NotificationBell() {
  const { items, unread, markAllRead, clear } = useNotifications();
  const navigate = useNavigate();
  const ref = useRef<HTMLDetailsElement>(null);

  const open = (ticketId: number) => {
    if (ref.current) ref.current.open = false;
    navigate(`/tickets/${ticketId}`);
  };

  return (
    <details
      ref={ref}
      className="notifmenu"
      onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) markAllRead(); }}
    >
      <summary className="notifmenu__trigger" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
        <IconBell />
        {unread > 0 && <span className="notifmenu__badge">{unread > 9 ? '9+' : unread}</span>}
      </summary>

      <div className="notifmenu__pop">
        <div className="notifmenu__head">
          <span>Notifications</span>
          {items.length > 0 && <button className="notifmenu__clear" onClick={clear}>Clear all</button>}
        </div>

        {items.length === 0 ? (
          <div className="notifmenu__empty">You're all caught up.</div>
        ) : (
          <ul className="notifmenu__list">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  className={`notifitem ${n.read ? '' : 'notifitem--unread'}`}
                  onClick={() => open(n.ticketId)}
                >
                  <span className={`notifitem__dot notifitem__dot--${n.kind}`} />
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
