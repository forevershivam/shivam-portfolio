import { NextResponse } from 'next/server';
import { getAdminSession, sameOrigin } from '@/lib/admin-auth';
import { supabaseRequest } from '@/lib/portfolio-supabase';
import { editableSections } from '@/lib/portfolio-defaults';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const response = await supabaseRequest('/rest/v1/portfolio_sections?select=section_key,content,published,updated_at&order=section_key.asc', {}, session.token);
  if (!response.ok) return NextResponse.json({ error: 'Failed to load content' }, { status: 502 });
  return NextResponse.json({ sections: await response.json() }, { headers: { 'Cache-Control': 'private, no-store' } });
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const textValue = (value: unknown, limit = 10000) => typeof value === 'string' && value.length <= limit;
const arr = (value: unknown, max: number) => Array.isArray(value) && value.length <= max;
const url = (value: unknown) => textValue(value, 1000) && (value === '' || /^https:\/\//.test(value as string) || /^\/(?!\/)/.test(value as string));
const listOfText = (value: unknown, max = 100) => arr(value, max) && (value as unknown[]).every(x => textValue(x, 400));

function valid(key: string, value: unknown): boolean {
  if (!isRecord(value) || JSON.stringify(value).length > 125000) return false;
  switch (key) {
    case 'hero': return ['firstName','lastName','description','typing'].every(k=>textValue(value[k],1500)) && listOfText(value.roles, 20);
    case 'about': return textValue(value.intro) && textValue(value.body, 12000) && url(value.photoUrl);
    case 'timeline': return arr(value.items, 40) && (value.items as unknown[]).every(x=>isRecord(x)&&['year','title','organization','stat','type'].every(k=>textValue(x[k],2000)));
    case 'skills': return textValue(value.description) && arr(value.services, 25) && (value.services as unknown[]).every(x=>isRecord(x)&&['id','title','description'].every(k=>textValue(x[k],3000))&&listOfText(x.items,50)) && arr(value.stack,20) && (value.stack as unknown[]).every(x=>isRecord(x)&&textValue(x.id,80)&&textValue(x.title,200)&&arr(x.technologies,80)&&(x.technologies as unknown[]).every(t=>isRecord(t)&&textValue(t.name,120)&&textValue(t.category,80)&&url(t.icon)));
    case 'navigation': return arr(value.links, 12) && (value.links as unknown[]).every(x=>isRecord(x)&&textValue(x.name,60)&&textValue(x.href,200)&&/^\/#[-a-z0-9]+$/.test(x.href as string));
    case 'socials': return ['github','linkedin','instagram'].every(k=>url(value[k]));
    case 'seo': return textValue(value.title,180) && textValue(value.description,400);
    case 'theme': return typeof value.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.accent);
    case 'projects': return arr(value.items, 25) && (value.items as unknown[]).every(x=>{
      if (!isRecord(x)) return false;
      const p=x as Record<string,unknown>;
      return typeof p.id==='number' && Number.isSafeInteger(p.id) && p.id>=0 &&
        typeof p.slug==='string' && /^[a-z0-9-]{2,80}$/.test(p.slug) &&
        ['title','type','role','description','overview','architecture','implementation','accent'].every(k=>textValue(p[k],12000)) &&
        /^#[0-9a-fA-F]{6}$/.test(p.accent as string) &&
        listOfText(p.tech,40) && listOfText(p.myRole,30) &&
        arr(p.images,25) && (p.images as unknown[]).length>0 && (p.images as unknown[]).every(url) &&
        url(p.hoverImage) && url(p.github) && url(p.liveUrl) &&
        arr(p.stats,15) && (p.stats as unknown[]).every(s=>isRecord(s)&&textValue(s.value,100)&&textValue(s.label,150));
    });
    default: return false;
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let input: { section?: string; content?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!input.section || !editableSections.some(s=>s === input.section) || !valid(input.section,input.content)) {
    return NextResponse.json({ error: 'Please check section fields and URL formats' }, { status: 422 });
  }
  const res = await supabaseRequest('/rest/v1/portfolio_sections?on_conflict=section_key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ section_key: input.section, content: input.content, published: true, updated_at: new Date().toISOString() }),
  }, session.token);
  if (!res.ok) return NextResponse.json({ error: 'Save failed. Check admin permissions.' }, { status: 502 });
  return NextResponse.json({ saved: true });
}
