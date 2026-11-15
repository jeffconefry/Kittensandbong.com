const base = (siteUrl: string) => siteUrl.replace(/\/+$/, '');

export const confirmUrl = (siteUrl: string, token: string) => `${base(siteUrl)}/confirm?t=${token}`;
export const unsubscribePageUrl = (siteUrl: string, token: string) => `${base(siteUrl)}/unsubscribe?t=${token}`;
/** Target of the List-Unsubscribe header (RFC 8058 one-click POST). */
export const unsubscribeApiUrl = (siteUrl: string, token: string) => `${base(siteUrl)}/api/unsubscribe?t=${token}`;

export const TOKEN_RE = /^[a-f0-9]{48}$/;

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
