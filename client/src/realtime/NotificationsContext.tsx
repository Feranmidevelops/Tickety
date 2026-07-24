import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from 'react';

export type NotificationKind = 'created' | 'assigned';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  message: string;
  ticketId: number;
  at: string;       // ISO timestamp
  read: boolean;
}

interface NotificationsApi {
  items: AppNotification[];
  unread: number;
  push: (n: { kind: NotificationKind; message: string; ticketId: number }) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsApi | null>(null);
const MAX = 30;

/** In-memory feed of queue notifications (new tickets, assignments) shown in the top-bar bell.
 *  Session-scoped — it isn't persisted, so a refresh starts clean. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const nextId = useRef(1);

  const push = useCallback((n: { kind: NotificationKind; message: string; ticketId: number }) => {
    setItems((cur) => [
      { ...n, id: nextId.current++, at: new Date().toISOString(), read: false },
      ...cur,
    ].slice(0, MAX));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((cur) => (cur.some((i) => !i.read) ? cur.map((i) => ({ ...i, read: true })) : cur));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);
  const value = useMemo(
    () => ({ items, unread, push, markAllRead, clear }),
    [items, unread, push, markAllRead, clear],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsApi {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
