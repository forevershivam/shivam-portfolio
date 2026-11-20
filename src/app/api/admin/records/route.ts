import { NextResponse } from 'next/server';
import { getAdminSession, sameOrigin } from '@/lib/admin-auth';
import { supabaseRequest } from '@/lib/portfolio-supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requests = [
    '/rest/v1/portfolio_contact_messages?select=id,sender_name,sender_email,message,status,created_at&order=created_at.desc&limit=50',
    '/rest/v1/portfolio_resume_downloads?select=id,visitor_name,company_name,contact_email,contact_phone,downloaded_at&order=downloaded_at.desc&limit=50',
    '/rest/v1/portfolio_resume_documents?select=id,display_name,storage_path,is_active,created_at&order=created_at.desc&limit=20',
  ];
  const countUrls=[
    '/rest/v1/portfolio_contact_messages?select=id&limit=1',
    '/rest/v1/portfolio_resume_downloads?select=id&limit=1',
    '/rest/v1/portfolio_media?select=id&limit=1',
  ];
  const [messages, downloads, resumes, ...countResponses] = await Promise.all([
    ...requests.map(path=>supabaseRequest(path,{},session.token)),
    ...countUrls.map(path=>supabaseRequest(path,{method:'HEAD',headers:{Prefer:'count=exact'}},session.token)),
  ]);
  if (![messages,downloads,resumes].every(r=>r.ok)) return NextResponse.json({ error: 'Cannot load private records' }, { status: 502 });
  return NextResponse.json({
    messages: await messages.json(), downloads: await downloads.json(), resumes: await resumes.json(),
    counts: Object.fromEntries(['messages','downloads','media'].map((key,index)=>{
      const response=countResponses[index];
      const range=response.ok?response.headers.get('Content-Range'):null;
      const end=range?.split('/').pop();
      return [key,end&&/^\d+$/.test(end)?Number(end):null];
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let data: { id?: string; status?: string };
  try { data=await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!data.id || !/^[\da-f-]{36}$/i.test(data.id) || !['unread','read','archived'].includes(data.status||'')) {
    return NextResponse.json({ error: 'Invalid status change' }, { status: 400 });
  }
  const response=await supabaseRequest(`/rest/v1/portfolio_contact_messages?id=eq.${data.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: data.status }),
  },session.token);
  if (!response.ok) return NextResponse.json({ error: 'Update failed' }, { status: 502 });
  return NextResponse.json({ updated: true });
}
