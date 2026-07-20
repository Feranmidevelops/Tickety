import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { categoryLabel } from '../lib/format';
import type { TicketCategory, TicketDetail, TicketPriority } from '../lib/types';

const categories: TicketCategory[] = ['Hardware', 'Network', 'Software', 'AccessRequest'];
const priorities: TicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export function NewTicket() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Hardware');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const ticket = await api.post<TicketDetail>('/api/tickets', {
        title: title.trim(), description: description.trim(), category, priority,
      });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.show(`Ticket #${ticket.id} created`, 'success');
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="subheader">
        <div className="subheader__title"><span className="t-title">New Ticket</span></div>
      </div>

      <div className="page page--narrow">
        <form className="panel" onSubmit={submit}>
          {error && <div className="authcard__error">{error}</div>}

          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the issue" required autoFocus maxLength={200} />
          </div>

          <div className="field">
            <label htmlFor="desc">Description</label>
            <textarea id="desc" className="textarea" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening? Include steps, error messages, and anything you've tried." required />
          </div>

          <div className="formrow">
            <div className="field">
              <label htmlFor="cat">Category</label>
              <select id="cat" className="select" value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}>
                {categories.map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pri">Priority</label>
              <select id="pri" className="select" value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}>
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="formactions">
            <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn btn--primary" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Create ticket'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
