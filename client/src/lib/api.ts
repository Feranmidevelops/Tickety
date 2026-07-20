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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeParse(text) : undefined;

  if (!res.ok) {
    const message =
      (data && (data.error || (data.errors && data.errors.join(', ')))) ||
      (res.status === 401 ? 'Your session has expired. Please sign in again.' : `Request failed (${res.status}).`);
    throw new ApiError(res.status, message);
  }
  return data as T;
}

function safeParse(text: string): any {
  try { return JSON.parse(text); } catch { return text; }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
};
