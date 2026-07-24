import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { TOKEN_KEY } from '../lib/config';
import { tokenExpiryMs } from '../lib/jwt';
import type { AuthResponse, Role, User } from '../lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Re-issue the token ~1 minute before it expires, so an active session never gets logged out.
  function scheduleRefresh(token: string) {
    clearTimeout(refreshTimer.current);
    const exp = tokenExpiryMs(token);
    if (exp == null) return;
    const delay = Math.max(exp - Date.now() - 60_000, 5_000);
    refreshTimer.current = setTimeout(refreshToken, delay);
  }

  async function refreshToken() {
    try {
      const res = await api.post<AuthResponse>('/api/auth/refresh');
      localStorage.setItem(TOKEN_KEY, res.token);
      setUser(res.user);
      scheduleRefresh(res.token);
    } catch {
      // Refresh failed (offline / already expired) — let it lapse; the next 401 sends them to login.
    }
  }

  // Restore session on load: if a token is stored, verify it, hydrate the user, and keep it fresh.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    api.get<User>('/api/auth/me')
      .then((u) => { setUser(u); scheduleRefresh(token); })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
    return () => clearTimeout(refreshTimer.current);
  }, []);

  async function login(email: string, password: string): Promise<User> {
    const res = await api.post<AuthResponse>('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    scheduleRefresh(res.token);
    return res.user;
  }

  function logout() {
    clearTimeout(refreshTimer.current);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
