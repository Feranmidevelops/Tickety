import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { API_URL, TOKEN_KEY } from '../lib/config';
import { useAuth } from '../auth/AuthContext';

export type PresenceStatus = 'Online' | 'Away' | 'Offline';

interface PresenceApi {
  /** Live status by userId. Only populated for admins/agents (who receive broadcasts). */
  presence: Record<string, PresenceStatus>;
}

const PresenceContext = createContext<PresenceApi>({ presence: {} });
const IDLE_MS = 2 * 60 * 1000; // go "away" after 2 minutes of no activity

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});

  useEffect(() => {
    if (!user) { setPresence({}); return; }

    const conn = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/presence`, { accessTokenFactory: () => localStorage.getItem(TOKEN_KEY) ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    conn.on('PresenceChanged', (p: { userId: string; status: PresenceStatus }) =>
      setPresence((cur) => ({ ...cur, [p.userId]: p.status })));

    let disposed = false;
    const started = conn.start().catch((e) => { if (!disposed) console.warn('presence hub failed to start', e); });

    // ——— Idle / away detection ———
    let away = false;
    let timer: number | undefined;
    const send = (status: 'away' | 'online') => { started.then(() => conn.invoke('SetStatus', status).catch(() => {})); };
    const goAway = () => { if (!away) { away = true; send('away'); } };
    const goActive = () => { if (away) { away = false; send('online'); } };
    const reset = () => { goActive(); window.clearTimeout(timer); timer = window.setTimeout(goAway, IDLE_MS); };
    const onVisibility = () => { if (document.hidden) goAway(); else reset(); };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    reset();

    return () => {
      disposed = true;
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
      started.finally(() => conn.stop());
    };
  }, [user?.id]);

  return <PresenceContext.Provider value={{ presence }}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return useContext(PresenceContext);
}
