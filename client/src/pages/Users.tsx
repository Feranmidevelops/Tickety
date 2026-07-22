import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { usePresence } from '../realtime/PresenceContext';
import { Avatar } from '../components/Avatar';
import { PresenceDot } from '../components/Presence';
import { StatCard, StatRow } from '../components/StatCard';
import { IconUsers, IconCheck, IconQueue, IconTicket } from '../components/icons';
import type { PresenceStatus, UserRow } from '../lib/types';
import './users.css';

export function Users() {
  const { presence } = usePresence();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserRow[]>('/api/users'),
    refetchInterval: 30_000,
  });

  // Overlay live presence on top of the status the API returned at load time.
  const rows = useMemo(
    () => users.map((u) => ({ ...u, status: (presence[u.id] ?? u.presence) as PresenceStatus })),
    [users, presence],
  );

  const stats = useMemo(() => ({
    total: rows.length,
    online: rows.filter((u) => u.status === 'Online').length,
    agents: rows.filter((u) => u.role === 'Agent').length,
    requesters: rows.filter((u) => u.role === 'Requester').length,
  }), [rows]);

  return (
    <div className="page">
      <StatRow>
        <StatCard label="Total Users" value={stats.total} tone="blue" icon={<IconUsers />} />
        <StatCard label="Online Now" value={stats.online} tone="green" icon={<IconCheck />} />
        <StatCard label="Agents" value={stats.agents} tone="amber" icon={<IconQueue />} />
        <StatCard label="Requesters" value={stats.requesters} tone="red" icon={<IconTicket />} />
      </StatRow>

      {isLoading ? (
        <div className="page"><span className="spinner" /></div>
      ) : (
        <div className="card usertable">
          <div className="usertable__head">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
          </div>
          {rows.map((u) => (
            <div key={u.id} className="usertable__row">
              <span className="usertable__user">
                <Avatar name={u.displayName} size={36} />
                <span className="usertable__id">
                  <span className="usertable__name">
                    {u.displayName}{!u.isActive && <span className="usertable__inactive">deactivated</span>}
                  </span>
                  <span className="usertable__email">{u.email}</span>
                </span>
              </span>
              <span><span className={`rolebadge rolebadge--${u.role}`}>{u.role}</span></span>
              <PresenceDot status={u.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
