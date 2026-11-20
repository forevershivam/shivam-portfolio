import { NextResponse } from 'next/server';
import { getAdminSession, sameOrigin } from '@/lib/admin-auth';
import { supabaseRequest } from '@/lib/portfolio-supabase';
import { editableSections, mergePortfolio, type PortfolioData, type EditableSection } from '@/lib/portfolio-defaults';
export const dynamic = 'force-dynamic';

const authorized = async () => getAdminSession();
const sectionAllowed = (section:unknown): section is string => typeof section==='string' && editableSections.some(s=>s===section);
const jsonHeaders = { 'Content-Type':'application/json' };
const upsert = async (path:string,body:unknown,token:string) => supabaseRequest(path,{
  method:'POST',headers:{ ...jsonHeaders, Prefer:'resolution=merge-duplicates,return=minimal' },body:JSON.stringify(body),
},token);

export async function GET() {
  const session=await authorized();
  if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const urls=[
    '/rest/v1/portfolio_sections?select=section_key,content,published,updated_at&order=section_key.asc',
    '/rest/v1/portfolio_drafts?select=section_key,content,updated_at&order=section_key.asc',
    '/rest/v1/portfolio_section_versions?select=id,section_key,published_at&order=id.desc&limit=100',
  ];
  const res=await Promise.all(urls.map(url=>supabaseRequest(url,{},session.token)));
  if(res.some(r=>!r.ok))return NextResponse.json({error:'Could not load editor data'},{status:502});
  const [sections,drafts,versions]=await Promise.all(res.map(r=>r.json()));
  return NextResponse.json({sections,drafts,versions},{headers:{'Cache-Control':'private, no-store'}});
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const textValue = (value: unknown, limit = 10000) => typeof value === 'string' && value.length <= limit;
const arr = (value: unknown, max: number) => Array.isArray(value) && value.length <= max;
const url = (value: unknown) => textValue(value, 1000) && (value === '' || /^https:\/\//.test(value as string) || /^\/(?!\/)/.test(value as string));
const listOfText = (value: unknown, max = 100) => arr(value, max) && (value as unknown[]).every(x => textValue(x, 400));

function valid(key: string, value: unknown): boolean {
  if (!isRecord(value) || JSON.stringify(value).length > 125000) return false;
  switch (key) {
    case 'hero': return ['firstName','lastName','description','typing'].every(k=>textValue(value[k],1500)) && typeof value.typingWpm==='number' && value.typingWpm>=0 && value.typingWpm<=250 && typeof value.typingAccuracy==='number' && value.typingAccuracy>=0 && value.typingAccuracy<=100 && listOfText(value.roles, 20);
    case 'about': return textValue(value.intro) && textValue(value.body, 12000) && url(value.photoUrl);
    case 'timeline': return arr(value.items, 40) && (value.items as unknown[]).every(x=>isRecord(x)&&['year','title','organization','stat','type'].every(k=>textValue(x[k],2000)));
    case 'skills': return textValue(value.description) && arr(value.services, 25) && (value.services as unknown[]).every(x=>isRecord(x)&&['id','title','description'].every(k=>textValue(x[k],3000))&&listOfText(x.items,50)) && arr(value.stack,20) && (value.stack as unknown[]).every(x=>isRecord(x)&&textValue(x.id,80)&&textValue(x.title,200)&&arr(x.technologies,80)&&(x.technologies as unknown[]).every(t=>isRecord(t)&&textValue(t.name,120)&&textValue(t.category,80)&&url(t.icon)));
    case 'navigation': return arr(value.links, 12) && (value.links as unknown[]).every(x=>isRecord(x)&&textValue(x.name,60)&&textValue(x.href,200)&&/^\/#[-a-z0-9]+$/.test(x.href as string));
    case 'socials': return ['github','linkedin','instagram'].every(k=>url(value[k]));
    case 'seo': return textValue(value.title,180) && textValue(value.description,400) && url(value.socialImage) && (value.siteUrl==='' || (url(value.siteUrl) && /^https:\/\//.test(value.siteUrl as string)));
    case 'theme': {
      const allowedColors=['accent','accentLight','accentDark','heading','text','muted','background','surface','lightBackground','lightText','border','button','buttonHover','buttonText','outline'];
      const colors=value.colors,fonts=value.typography,rad=value.radius;
      return isRecord(colors)&&allowedColors.every(k=>typeof colors[k]==='string'&&/^#[0-9a-fA-F]{6}$/.test(colors[k] as string))
        && typeof value.accent==='string'&&value.accent===colors.accent
        && isRecord(fonts)&&['headings','body','buttons','accents'].every(k=>['geist','space','instrument','mono'].includes(fonts[k] as string))
        && isRecord(rad)&&['buttons','cards'].every(k=>typeof rad[k]==='number'&&Number.isFinite(rad[k] as number)&&(rad[k] as number)>=0&&(rad[k] as number)<=48);
    }
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


export async function PUT(request:Request) {
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
  const session=await authorized();
  if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const data=await request.json().catch(()=>null);
  if(!data||!sectionAllowed(data.section)||!valid(data.section,data.content))return NextResponse.json({error:'Check the section fields and URL formats'},{status:422});
  const r=await upsert('/rest/v1/portfolio_drafts?on_conflict=section_key',{section_key:data.section,content:data.content,updated_at:new Date().toISOString()},session.token);
  if(!r.ok)return NextResponse.json({error:'Could not save draft'},{status:502});
  return NextResponse.json({saved:true,status:'draft'});
}

export async function POST(request:Request) {
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
  const session=await authorized();
  if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const data=await request.json().catch(()=>null);
  if(!data||!sectionAllowed(data.section))return NextResponse.json({error:'Invalid section'},{status:400});
  if(data.action==='restore'){
    if(!Number.isSafeInteger(data.versionId)||data.versionId<=0)return NextResponse.json({error:'Invalid history entry'},{status:400});
    const r=await supabaseRequest(`/rest/v1/portfolio_section_versions?select=content&section_key=eq.${encodeURIComponent(data.section)}&id=eq.${data.versionId}&limit=1`,{},session.token);
    if(!r.ok)return NextResponse.json({error:'Could not read history'},{status:502});
    const [snapshot]=await r.json();
    if(!snapshot||!snapshot.content)return NextResponse.json({error:'History version was not found'},{status:404});
    // Old versions may predate newer fields (theme palette, social image or typing stats).
    const normalized=mergePortfolio({[data.section]:snapshot.content} as Partial<PortfolioData>)[data.section as EditableSection];
    if(!valid(data.section,normalized))return NextResponse.json({error:'History version not compatible with editor fields'},{status:422});
    const write=await upsert('/rest/v1/portfolio_drafts?on_conflict=section_key',{section_key:data.section,content:normalized,updated_at:new Date().toISOString()},session.token);
    if(!write.ok)return NextResponse.json({error:'Could not restore draft'},{status:502});
    return NextResponse.json({restored:true,content:snapshot.content,status:'draft'});
  }
  if(data.action!=='publish')return NextResponse.json({error:'Unknown action'},{status:400});
  const draft=await supabaseRequest(`/rest/v1/portfolio_drafts?select=content&section_key=eq.${encodeURIComponent(data.section)}&limit=1`,{},session.token);
  if(!draft.ok)return NextResponse.json({error:'Could not read draft'},{status:502});
  const [entry]=await draft.json();
  if(!entry)return NextResponse.json({error:'Save a draft first'},{status:404});
  if(!valid(data.section,entry.content))return NextResponse.json({error:'Draft is not valid'},{status:422});
  const result=await supabaseRequest('/rest/v1/rpc/portfolio_publish_draft',{method:'POST',headers:jsonHeaders,body:JSON.stringify({p_section_key:data.section})},session.token);
  if(!result.ok)return NextResponse.json({error:'Could not publish. Draft remains saved.'},{status:502});
  const published=await result.json();
  if(published!==true)return NextResponse.json({error:'Draft no longer exists'},{status:409});
  return NextResponse.json({published:true});
}

export async function DELETE(request:Request) {
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
  const session=await authorized();if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const section=new URL(request.url).searchParams.get('section');
  if(!sectionAllowed(section))return NextResponse.json({error:'Invalid section'},{status:400});
  const result=await supabaseRequest(`/rest/v1/portfolio_drafts?section_key=eq.${encodeURIComponent(section)}`,{method:'DELETE'},session.token);
  if(!result.ok)return NextResponse.json({error:'Could not discard draft'},{status:502});
  return NextResponse.json({discarded:true});
}
