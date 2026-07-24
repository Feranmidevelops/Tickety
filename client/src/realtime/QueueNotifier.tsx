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

  // Ask once so we can also notify when the tab is in the background.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default')
      Notification.requestPermission().catch(() => {});
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
      push({ kind: 'assigned', message: `Assigned to you — #${t.id}: ${t.title}`, ticketId: t.id });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Ticket assigned to you', { body: `#${t.id}: ${t.title}`, tag: `ticket-${t.id}` });
        } catch { /* ignore */ }
      }
    },
  });

  return null;
}
