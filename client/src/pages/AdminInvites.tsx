import { useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import type { InviteCreated, Role } from '../lib/types';
import './admininvites.css';

const roles: Role[] = ['Requester', 'Agent', 'Admin'];

export function AdminInvites() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Requester');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<InviteCreated[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const invite = await api.post<InviteCreated>('/api/invites', { email: email.trim(), role });
      setCreated((cur) => [invite, ...cur]);
      setEmail('');
      toast.show(
        invite.emailed ? `Invite emailed to ${invite.email}` : `Invite created (email not sent — copy the link)`,
        invite.emailed ? 'success' : 'warning');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.show('Invite link copied', 'success'));
  }

  return (
    <>
      <div className="subheader">
        <div className="subheader__title"><span className="t-title">Invite Users</span></div>
      </div>

      <div className="page page--narrow">
        <form className="panel" onSubmit={submit}>
          {error && <div className="authcard__error">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="formactions">
            <button className="btn btn--primary" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Create invite'}
            </button>
          </div>
        </form>

        <p className="t-caption t-muted invites__note">
          Invitees are emailed the accept link automatically. You can also copy it below as a fallback.
        </p>

        {created.length > 0 && (
          <div className="invites">
            {created.map((inv) => (
              <div key={inv.token} className="invite">
                <div className="invite__top">
                  <span className="invite__email">{inv.email}</span>
                  <span className="badge badge--New">{inv.role}</span>
                </div>
                <div className="invite__link">
                  <code>{inv.acceptUrl}</code>
                  <button className="btn btn--secondary btn--sm" onClick={() => copy(inv.acceptUrl)}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
