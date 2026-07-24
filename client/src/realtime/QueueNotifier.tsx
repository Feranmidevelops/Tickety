import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { useQueueHub } from './signalr';
import { playPing } from '../lib/ping';

/** Mounted app-wide for agents/admins. Keeps every ticket list live, toasts on new tickets,
 *  and — when a ticket is assigned to *you* — pings: a chime, a toast, and (if allowed) a
 *  browser notification, so a task landing on you is never a silent arrival. */
export function QueueNotifier() {
  const qc = useQueryClient();
  const toast = useToast();

  // Ask once so we can also notify when the tab is in the background.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default')
      Notification.requestPermission().catch(() => {});
  }, []);

  useQueueHub({
    onCreated: (t) => {
      toast.show(`New ticket #${t.id}: ${t.title}`, 'info');
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onUpdated: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
    onAssignedToYou: (t) => {
      playPing();
      toast.show(`🔔 Assigned to you — #${t.id}: ${t.title}`, 'success');
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
