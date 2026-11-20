import { NextResponse } from 'next/server';
import { clearTokens, getAdminSession, sameOrigin, saveTokens, verifyAdminToken } from '@/lib/admin-auth';
import { getSupabaseConfig, supabaseRequest } from '@/lib/portfolio-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json({ authenticated: Boolean(session), email: session?.email || null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  if (!getSupabaseConfig()) return NextResponse.json({ error: 'Admin backend not configured' }, { status: 503 });
  let payload: { email?: string; password?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (typeof payload.email !== 'string' || typeof payload.password !== 'string' || payload.email.length > 320 || payload.password.length > 200) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }
  try {
    const response = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: payload.email.trim(), password: payload.password }),
    });
    if (!response.ok) return NextResponse.json({ error: 'Invalid credentials or account not authorized' }, { status: 401 });
    const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
    const user = await verifyAdminToken(data.access_token);
    if (!user) return NextResponse.json({ error: 'This account is not an authorized portfolio admin' }, { status: 403 });
    await saveTokens(data);
    return NextResponse.json({ authenticated: true, email: user.email }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Sign-in temporarily unavailable' }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  await clearTokens();
  return NextResponse.json({ authenticated: false });
}
