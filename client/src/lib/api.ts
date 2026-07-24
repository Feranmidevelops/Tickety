import { API_URL, TOKEN_KEY } from './config';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function token(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Human-friendly fallback when the server didn't send its own error message. */
function fallbackMessage(status: number): string {
  if (status === 0) return "Can't reach the server — it may be waking up. Please try again in a few seconds.";
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 409) return 'That conflicts with something that already exists.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again in a moment.';
  return `Request failed (${status}).`;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network error / CORS failure / server asleep — fetch rejects with no response.
    throw new ApiError(0, fallbackMessage(0));
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeParse(text) : undefined;

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(path);
    const serverMessage = data && (data.error || (Array.isArray(data.errors) && data.errors.join(', ')));
    throw new ApiError(res.status, serverMessage || fallbackMessage(res.status));
  }
  return data as T;
}

/** A 401 mid-session means the token has expired (there's no refresh flow). Clear it and bounce
 *  to a clean login screen, rather than leaving the user stuck on a page that keeps erroring.
 *  The auth calls (login / me) and the auth pages handle their own 401s, so skip them. */
function handleUnauthorized(path: string): void {
  if (path.startsWith('/api/auth/')) return;
  localStorage.removeItem(TOKEN_KEY);
  const { pathname } = window.location;
  if (pathname.startsWith('/login') || pathname.startsWith('/accept-invite')) return;
  window.location.assign('/login?expired=1');
}

function safeParse(text: string): any {
  try { return JSON.parse(text); } catch { return text; }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
};
