import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { useQueueHub } from './signalr';
import { useNotifications } from './NotificationsContext';
import { playPing } from '../lib/ping';

/** Mounted app-wide for agents/admins. Keeps every ticket list live, and turns queue activity
 *  into pings + a top-bar notification feed: a soft blip for new tickets, and — when a ticket is
 *  assigned to *you* — a chime, a toast, and (if allowed) a browser notification. Nothing arrives
 *  silently. */
export function QueueNotifier() {
  const qc = useQueryClient();
  const toast = useToast();
  const { push } = useNotifications();

  // Ask for notification permission on the first real interaction (a gesture browsers accept),
  // rather than nagging the moment the app loads.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    const ask = () => {
      Notification.requestPermission().catch(() => {});
      window.removeEventListener('pointerdown', ask);
      window.removeEventListener('keydown', ask);
    };
    window.addEventListener('pointerdown', ask, { once: true });
    window.addEventListener('keydown', ask, { once: true });
    return () => {
      window.removeEventListener('pointerdown', ask);
      window.removeEventListener('keydown', ask);
    };
  }, []);

  useQueueHub({
    onCreated: (t) => {
      playPing('blip');
      toast.show(`New ticket #${t.id}: ${t.title}`, 'info');
      push({ kind: 'created', message: `New ticket #${t.id}: ${t.title}`, ticketId: t.id });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onUpdated: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
    onAssignedToYou: (t) => {
      playPing('chime');
      toast.show(`🔔 Assigned to you — #${t.id}: ${t.title}`, 'success');
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });   // the server persisted it — refresh the bell
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Ticket assigned to you', { body: `#${t.id}: ${t.title}`, tag: `ticket-${t.id}` });
        } catch { /* ignore */ }
      }
    },
  });

  return null;
}
