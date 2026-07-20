import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { InviteInfo } from '../lib/types';
import './auth.css';

export function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setLoadError('No invite token provided.'); return; }
    api.get<InviteInfo>(`/api/invites/${token}`)
      .then(setInfo)
      .catch((e) => setLoadError((e as Error).message));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post(`/api/invites/${token}/accept`, { displayName: displayName.trim(), password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authscreen">
      <div className="authcard">
        <div className="authcard__brand"><span>◆</span> Tickety</div>

        {loadError ? (
          <>
            <div className="authcard__subtitle">Invite unavailable</div>
            <div className="authcard__error">{loadError}</div>
            <Link className="btn btn--secondary btn--block" to="/login">Back to sign in</Link>
          </>
        ) : done ? (
          <>
            <div className="authcard__subtitle">Account created 🎉</div>
            <p className="t-secondary" style={{ fontSize: 14 }}>Redirecting you to sign in…</p>
          </>
        ) : !info ? (
          <div className="authcard__subtitle"><span className="spinner" /> Validating invite…</div>
        ) : (
          <form onSubmit={submit}>
            <div className="authcard__subtitle">
              Set up your account for <strong>{info.email}</strong> ({info.role}).
            </div>
            {error && <div className="authcard__error">{error}</div>}
            <div className="field">
              <label htmlFor="name">Display name</label>
              <input id="name" className="input" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="pw">Password</label>
              <input id="pw" className="input" type="password" autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters" required />
            </div>
            <button className="btn btn--primary btn--block" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
