import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PasswordInput } from '../components/PasswordInput';
import './auth.css';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const [params] = useSearchParams();
  const expired = params.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      const dest = location.state?.from?.pathname
        ?? (user.role === 'Requester' ? '/my-tickets' : '/queue');
      navigate(dest, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authscreen">
      <form className="authcard" onSubmit={submit}>
        <div className="authcard__brand"><span>◆</span> Tickety</div>
        <div className="authcard__subtitle">Sign in to your support workspace.</div>

        {expired && !error && (
          <div className="authcard__notice">Your session expired. Please sign in again.</div>
        )}
        {error && <div className="authcard__error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput id="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Sign in'}
        </button>

        <div className="authcard__hint">
          Accounts are invite-only. Ask an admin for an invite link if you don't have one.
        </div>
      </form>
    </div>
  );
}
