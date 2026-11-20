import { cookies } from 'next/headers';
import { getSupabaseConfig, supabaseRequest } from '@/lib/portfolio-supabase';

const ACCESS = 'sp_admin_access';
const REFRESH = 'sp_admin_refresh';
const secure = process.env.NODE_ENV === 'production';
type Tokens = { access_token: string; refresh_token: string; expires_in: number };

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
    return originUrl.host === host && ['https:', 'http:'].includes(originUrl.protocol);
  } catch {
    return false;
  }
}

export async function saveTokens(tokens: Tokens) {
  const jar = await cookies();
  const flags = { httpOnly: true, secure, sameSite: 'strict' as const, path: '/api/admin' };
  jar.set(ACCESS, tokens.access_token, { ...flags, maxAge: Math.max(60, tokens.expires_in - 30) });
  jar.set(REFRESH, tokens.refresh_token, { ...flags, maxAge: 60 * 60 * 24 * 7 });
}
export async function clearTokens() {
  const jar = await cookies();
  jar.set(ACCESS, '', { path: '/api/admin', maxAge: 0, httpOnly: true, secure, sameSite: 'strict' });
  jar.set(REFRESH, '', { path: '/api/admin', maxAge: 0, httpOnly: true, secure, sameSite: 'strict' });
}

async function currentUser(access: string) {
  const res = await supabaseRequest('/auth/v1/user', {}, access);
  if (!res.ok) return null;
  return await res.json() as { id: string; email?: string };
}

async function checkMembership(access: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const res = await supabaseRequest(`/rest/v1/portfolio_admins?select=user_id&user_id=eq.${id}&limit=1`, {}, access);
  if (!res.ok) return false;
  const rows = await res.json() as Array<{ user_id: string }>;
  return rows.some(row => row.user_id === id);
}

export async function verifyAdminToken(access: string): Promise<{ id: string; email: string } | null> {
  try {
    const user = await currentUser(access);
    if (!user || !(await checkMembership(access, user.id))) return null;
    return { id: user.id, email: user.email || '' };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ token: string; email: string } | null> {
  if (!getSupabaseConfig()) return null;
  const jar = await cookies();
  let access = jar.get(ACCESS)?.value;
  if (access) {
    const user = await verifyAdminToken(access);
    if (user) return { token: access, email: user.email };
  }
  const refresh = jar.get(REFRESH)?.value;
  if (!refresh) return null;
  try {
    const res = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return null;
    const tokens = await res.json() as Tokens;
    if (!tokens.access_token || !tokens.refresh_token) return null;
    const user = await verifyAdminToken(tokens.access_token);
    if (!user) return null;
    await saveTokens(tokens);
    access = tokens.access_token;
    return { token: access, email: user.email };
  } catch {
    return null;
  }
}
