/** Read the `exp` claim (ms since epoch) from a JWT without verifying it — used only to schedule
 *  a proactive refresh on the client. Returns null if the token can't be parsed. */
export function tokenExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}
