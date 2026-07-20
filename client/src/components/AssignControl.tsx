import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { useToast } from './Toast';
import type { Agent, TicketDetail } from '../lib/types';

/** Inline assignee picker shown on the ticket rail for agents/admins. */
export function AssignControl({
  ticketId, currentAgentId,
}: {
  ticketId: number;
  currentAgentId: string | null;
  currentAgentName: string | null;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get<Agent[]>('/api/agents'),
  });

  async function assign(agentId: string) {
    if (!agentId || agentId === currentAgentId) return;
    setBusy(true);
    try {
      const updated = await api.post<TicketDetail>(`/api/tickets/${ticketId}/assign`, { agentId });
      qc.setQueryData(['ticket', ticketId], updated);
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.show('Ticket reassigned', 'success');
    } catch (err) {
      toast.show((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      className="select"
      value={currentAgentId ?? ''}
      disabled={busy}
      onChange={(e) => assign(e.target.value)}
    >
      <option value="" disabled>Unassigned</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>{a.displayName}</option>
      ))}
    </select>
  );
}
