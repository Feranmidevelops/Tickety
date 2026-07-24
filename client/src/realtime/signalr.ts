import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';
import { useEffect, useRef } from 'react';
import { API_URL, TOKEN_KEY } from '../lib/config';
import type { TicketDetail, TicketSummary } from '../lib/types';

function build(hub: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/${hub}`, {
      accessTokenFactory: () => localStorage.getItem(TOKEN_KEY) ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

/** Subscribe to the shared agent queue channel (agents/admins only). */
export function useQueueHub(handlers: {
  onCreated?: (t: TicketSummary) => void;
  onUpdated?: (t: TicketSummary) => void;
  onAssignedToYou?: (t: TicketSummary) => void;
}) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const conn = build('queue');
    conn.on('TicketCreated', (t: TicketSummary) => ref.current.onCreated?.(t));
    conn.on('QueueUpdated', (t: TicketSummary) => ref.current.onUpdated?.(t));
    conn.on('AssignedToYou', (t: TicketSummary) => ref.current.onAssignedToYou?.(t));

    // Guard against React StrictMode's mount→unmount→mount: the cleanup awaits the
    // start promise before stopping, so we never abort a connection mid-negotiation.
    let disposed = false;
    const started = conn.start().catch((e) => {
      if (!disposed) console.warn('queue hub failed to start', e);
    });

    return () => {
      disposed = true;
      started.finally(() => { conn.stop(); });
    };
  }, []);
}

/** Subscribe to a single ticket's channel for live status/timeline updates. */
export function useTicketHub(ticketId: number | undefined, onChanged: (t: TicketDetail) => void) {
  const cb = useRef(onChanged);
  cb.current = onChanged;

  useEffect(() => {
    if (!ticketId) return;
    const conn = build('ticket');
    conn.on('TicketChanged', (t: TicketDetail) => cb.current(t));

    let disposed = false;
    const started = conn.start()
      .then(() => { if (!disposed) return conn.invoke('JoinTicket', ticketId); })
      .catch((e) => { if (!disposed) console.warn('ticket hub failed to start', e); });

    return () => {
      disposed = true;
      started.finally(() => { conn.stop(); });
    };
  }, [ticketId]);
}
