'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, ExternalLink, FileText, ImagePlus, LogOut, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { mergePortfolio, portfolioDefaults, type PortfolioData, type EditableSection, type TimelineEntry, type SkillEntry, type MenuLink } from '@/lib/portfolio-defaults';
import type { Project } from '@/lib/projects';
import ThemeStudio from './ThemeStudio';
import type { ThemePreset } from '@/lib/portfolio-theme';

type View = EditableSection | 'overview' | 'media' | 'resume' | 'inbox' | 'downloads';
type Message = { id:string;sender_name:string;sender_email:string;message:string;status:string;created_at:string };
type DownloadRecord = { id:string;visitor_name:string;company_name:string;contact_email:string|null;contact_phone:string|null;downloaded_at:string };
type ResumeRecord = { id:string;display_name:string;is_active:boolean;created_at:string };
type MediaRecord = {id:string;storage_path:string;alt_text:string;created_at:string;published:boolean;url:string};
type VersionRecord = {id:number;section_key:string;published_at:string};
const groups: {heading:string;items:{key:View;label:string}[]}[] = [
  { heading:'Workspace',items:[{key:'overview',label:'Overview'}, {key:'inbox',label:'Contact inbox'}, {key:'downloads',label:'CV activity'}]},
  { heading:'Site editor',items:[{key:'hero',label:'Homepage'}, {key:'about',label:'About me'}, {key:'timeline',label:'Timeline'}, {key:'skills',label:'Skills & services'}, {key:'projects',label:'Projects'}, {key:'navigation',label:'Navigation'}, {key:'socials',label:'Social links'}, {key:'seo',label:'SEO'}, {key:'theme',label:'Theme Studio'}]},
  { heading:'Files',items:[{key:'media',label:'Media Library'}, {key:'resume',label:'Resume manager'}]},
];
const editable: EditableSection[]=['hero','about','timeline','skills','projects','navigation','socials','seo','theme'];
const ui={
  label:'mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]',
  input:'w-full rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] px-4 py-3 text-[14px] text-[#162536] outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15',
  card:'rounded-2xl border border-[#DCE5EA] bg-[#FFFFFF] p-5 md:p-6',
  button:'inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE5EA] bg-[#F8FAFC] px-4 py-2.5 text-sm font-semibold text-[#26435A] transition hover:bg-[#E8F3EE] disabled:opacity-50',
  danger:'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#B42318] hover:bg-[#FFF1F2]/40',
};
function Field({label,value,onChange,multiline=false,placeholder='',type='text'}:{
  label:string;value:string;onChange:(v:string)=>void;multiline?:boolean;placeholder?:string;type?:string
}){
  return <label className="block"><span className={ui.label}>{label}</span>{multiline?
    <textarea rows={4} className={ui.input+' min-h-[100px] resize-y'} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />:
    <input className={ui.input} type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function Lines({label,items,onChange}:{label:string;items:string[];onChange:(v:string[])=>void}){
  return <Field label={label+' (one per line)'} multiline value={items.join('\n')} onChange={v=>onChange(v.split('\n').map(s=>s.trim()).filter(Boolean))}/>;
}
function Panel({title,subtitle,children}:{title:string;subtitle?:string;children:ReactNode}){
  return <section className={ui.card}><div className="mb-5"><h2 className="text-xl font-semibold text-slate-900">{title}</h2>{subtitle&&<p className="mt-2 text-sm leading-6 text-[#64748B]">{subtitle}</p>}</div>{children}</section>;
}
function Move({up,down,remove}:{up:()=>void;down:()=>void;remove:()=>void}){
  return <div className="flex items-center gap-1.5">
    <button type="button" className={ui.button+' !px-2.5'} title="Move up" onClick={up}><ArrowUp size={14}/></button>
    <button type="button" className={ui.button+' !px-2.5'} title="Move down" onClick={down}><ArrowDown size={14}/></button>
    <button type="button" className={ui.danger} onClick={remove}><Trash2 size={14}/> Remove</button>
  </div>;
}
const makeProject=():Project=>({
  id:Date.now(),slug:'new-project',title:'New Project',type:'Analytics',role:'Personal Analytics Project',
  tech:[],description:'',overview:'',architecture:'',implementation:'',stats:[],accent:'#0F766E',
  myRole:[],images:['/Projects/excel-sales.svg'],hoverImage:'/Projects/excel-sales.svg',github:'',liveUrl:'',
});

export default function AdminDashboard() {
  const [session,setSession]=useState<'checking'|'guest'|'admin'>('checking');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loginError,setLoginError]=useState('');
  const [view,setView]=useState<View>('overview');
  const [data,setData]=useState<PortfolioData>(portfolioDefaults);
  const [draftKeys,setDraftKeys]=useState<Set<string>>(new Set());
  const [versions,setVersions]=useState<VersionRecord[]>([]);
  const [media,setMedia]=useState<MediaRecord[]>([]);
  const [presets,setPresets]=useState<ThemePreset[]>([]);
  const [counts,setCounts]=useState<{messages:number|null;downloads:number|null;media:number|null}>({messages:null,downloads:null,media:null});
  const [dirty,setDirty]=useState(false);
  const [previewOpen,setPreviewOpen]=useState(false);
  const [previewWidth,setPreviewWidth]=useState<'desktop'|'mobile'>('desktop');
  const [pickerTarget,setPickerTarget]=useState<'about'|'seo'|'project'|null>(null);
  const previewRef=useRef<HTMLIFrameElement>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [downloads,setDownloads]=useState<DownloadRecord[]>([]);
  const [resumes,setResumes]=useState<ResumeRecord[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [fail,setFail]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [uploadKind,setUploadKind]=useState<'photo'|'project'|'resume'>('photo');
  const [recentImage,setRecentImage]=useState('');
  const [activeProject,setActiveProject]=useState(0);

  const change=(f:(draft:PortfolioData)=>void)=>{
    setData(prev=>{const next=structuredClone(prev);f(next);return next;});
    setNotice('');setDirty(true);
  };
  const move=<T,>(items:T[],index:number,to:number)=>{
    if(to<0||to>=items.length)return items;
    const result=[...items];[result[index],result[to]]=[result[to],result[index]];return result;
  };
  const request=async(path:string,init?:RequestInit)=>{
    const res=await fetch(path,{...init,credentials:'same-origin',cache:'no-store'});
    const json=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(json.error||'Request failed');
    return json;
  };
  const load=async()=>{
    const [content,records,images,presetData]=await Promise.all([
      request('/api/admin/sections'),request('/api/admin/records'),
      request('/api/admin/media'),request('/api/admin/presets'),
    ]);
    const live: Record<string,object>={};
    const draft: Record<string,object>={};
    for(const row of content.sections||[])if(row.published)live[row.section_key]=row.content;
    for(const row of content.drafts||[])draft[row.section_key]=row.content;
    setData(mergePortfolio({...live,...draft} as Partial<PortfolioData>));
    setDraftKeys(new Set(Object.keys(draft)));
    setVersions(content.versions||[]);
    setMedia(images.media||[]);
    setPresets(presetData.presets||[]);
    setCounts(records.counts||{messages:null,downloads:null,media:null});
    setMessages(records.messages||[]);
    setDownloads(records.downloads||[]);
    setResumes(records.resumes||[]);
    setDirty(false);
  };
  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const s=await request('/api/admin/auth');
        if(!active)return;
        if(s.authenticated){
          setEmail(s.email||'');setSession('admin');
          try{await load();}catch(e){if(active)setFail(e instanceof Error?e.message:'Could not load dashboard');}
        }else setSession('guest');
      }catch{if(active)setSession('guest');}
    })();
    return ()=>{active=false;};
    // Only check the session once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const login=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setLoginError('');
    try{
      const r=await request('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      setEmail(r.email||email);setPassword('');setSession('admin');await load();
    }catch(e){setLoginError(e instanceof Error?e.message:'Login failed');}
    finally{setBusy(false);}
  };
  const logout=async()=>{
    setBusy(true);
    try{await request('/api/admin/auth',{method:'DELETE'});}finally{setSession('guest');setEmail('');setPassword('');setData(portfolioDefaults);setDraftKeys(new Set());setDirty(false);setBusy(false);}
  };
  const save=async()=>{
    if(!editable.includes(view as EditableSection))return;
    setBusy(true);setNotice('');setFail('');
    try{
      await request('/api/admin/sections',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({section:view,content:data[view as EditableSection]})});
      setDraftKeys(previous=>new Set([...previous,view]));
      setDirty(false);
      setNotice('Draft saved privately. Public website is unchanged until you click Publish.');
    }catch(e){setFail(e instanceof Error?e.message:'Unable to save draft');}
    finally{setBusy(false);}
  };
  const publish=async()=>{
    if(!editable.includes(view as EditableSection))return;
    setBusy(true);setNotice('');setFail('');
    try{
      if(dirty||!draftKeys.has(view)){
        await request('/api/admin/sections',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({section:view,content:data[view as EditableSection]})});
      }
      await request('/api/admin/sections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({section:view,action:'publish'})});
      await load();setNotice('Published! Refresh your public website to see the update.');
    }catch(e){setFail(e instanceof Error?e.message:'Unable to publish');}
    finally{setBusy(false);}
  };
  const restoreVersion=async(id:number)=>{
    if(!editable.includes(view as EditableSection))return;
    if(dirty&&!window.confirm('This replaces your unsaved changes with an older version. Continue?'))return;
    setBusy(true);setFail('');setNotice('');
    try{
      await request('/api/admin/sections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({section:view,action:'restore',versionId:id})});
      await load();setNotice('Version restored to Draft. Preview it and Publish when ready.');
    }catch(e){setFail(e instanceof Error?e.message:'Could not restore version');}
    finally{setBusy(false);}
  };
  const discardDraft=async()=>{
    if(!editable.includes(view as EditableSection)||!window.confirm('Discard this section\'s saved draft and unsaved edits?'))return;
    setBusy(true);setFail('');
    try{
      if(draftKeys.has(view))await request('/api/admin/sections?section='+view,{method:'DELETE'});
      await load();setNotice('Draft discarded. Published content is unchanged.');
    }catch(e){setFail(e instanceof Error?e.message:'Could not discard draft');}
    finally{setBusy(false);}
  };
  const savePresets=async(next:ThemePreset[])=>{
    const result=await request('/api/admin/presets',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({presets:next})});
    setPresets(result.presets||next);
  };
  const refreshMedia=async()=>{const result=await request('/api/admin/media');setMedia(result.media||[]);};
  const deleteImage=async(id:string)=>{
    if(!window.confirm('Delete this image permanently? Used images cannot be removed.'))return;
    setBusy(true);setFail('');
    try{await request('/api/admin/media?id='+id,{method:'DELETE'});await refreshMedia();setNotice('Image deleted.');}
    catch(e){setFail(e instanceof Error?e.message:'Cannot delete image');}
    finally{setBusy(false);}
  };
  const attachImage=(url:string)=>{
    if(!pickerTarget)return;
    change(d=>{
      if(pickerTarget==='about')d.about.photoUrl=url;
      if(pickerTarget==='seo')d.seo.socialImage=url;
      if(pickerTarget==='project'&&d.projects.items[activeProject]){
        const p=d.projects.items[activeProject];
        if(!p.images.includes(url))p.images.push(url);
        if(!p.hoverImage)p.hoverImage=url;
      }
    });
    setPickerTarget(null);setNotice('Image attached. Save Draft to keep it.');
  };
  const sendPreview=()=>{
    previewRef.current?.contentWindow?.postMessage({kind:'portfolio-preview-content',content:data},window.location.origin);
  };
  useEffect(()=>{
    if(previewOpen)sendPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[data,previewOpen]);
  useEffect(()=>{
    const ready=(event:MessageEvent)=>{if(event.origin===window.location.origin&&event.source===previewRef.current?.contentWindow&&event.data?.kind==='portfolio-preview-ready')sendPreview();};
    window.addEventListener('message',ready);return()=>window.removeEventListener('message',ready);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[data]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  const upload=async(e:FormEvent)=>{
    e.preventDefault();if(!file)return;
    setBusy(true);setNotice('');setFail('');
    try{
      const fd=new FormData();fd.set('kind',uploadKind);fd.set('file',file);
      const r=await request('/api/admin/upload',{method:'POST',body:fd});
      setFile(null);
      const form=document.getElementById('admin-file-input') as HTMLInputElement|null;
      if(form)form.value='';
      if(uploadKind==='resume'){setNotice('Resume privately uploaded. Public download remains disabled.');await load();}
      else{
        setRecentImage(r.url);
        await refreshMedia();
        if(uploadKind==='photo')change(d=>{d.about.photoUrl=r.url;});
        setNotice(uploadKind==='photo'?'Portrait uploaded. Open About me, then Save Draft and Publish.':'Image uploaded. Use the image picker to add it to a project.');
      }
    }catch(e){setFail(e instanceof Error?e.message:'Upload failed');}
    finally{setBusy(false);}
  };
  const changeMessage=async(id:string,status:string)=>{
    setBusy(true);setFail('');
    try{
      await request('/api/admin/records',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});
      setMessages(prev=>prev.map(m=>m.id===id?{...m,status}:m));
    }catch(e){setFail(e instanceof Error?e.message:'Update failed');}
    finally{setBusy(false);}
  };
  const project=data.projects.items[activeProject];

  if(session==='checking') return <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] text-[#0F766E]">Verifying admin session…</main>;
  if(session==='guest')return <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] p-5 text-[#162536]">
    <div className="absolute left-6 top-6 text-sm font-black uppercase tracking-widest text-[#0F766E]">SHIVAM / ADMIN</div>
    <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-[#DCE5EA] bg-[#FFFFFF] p-7 shadow-2xl sm:p-10">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#0F766E]"><ShieldCheck size={29}/></div>
      <h1 className="text-3xl font-black tracking-tight">Welcome back.</h1>
      <p className="mt-2 mb-8 text-sm leading-6 text-[#64748B]">Sign in with your authorized Supabase admin account. The portfolio remains public; editing is private.</p>
      <div className="space-y-5">
        <Field label="Admin email" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
        <label className="block"><span className={ui.label}>Password</span><input className={ui.input} value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required minLength={6}/></label>
      </div>
      {loginError&&<p role="alert" className="mt-5 rounded-xl bg-red-950/40 p-3 text-sm text-red-200">{loginError}</p>}
      <button disabled={busy||!email||!password} className="mt-7 w-full rounded-xl bg-[#0F766E] px-5 py-3.5 font-bold text-[#FFFFFF] transition hover:bg-[#115E59] disabled:opacity-50">{busy?'Signing in…':'Sign in securely →'}</button>
      <Link href="/" className="mt-5 block text-center text-xs text-[#64748B] hover:text-slate-900">← Back to portfolio</Link>
    </form>
  </main>;
  return <main className="min-h-screen bg-[#F6F8FB] font-sans text-[#162536]">
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="w-full border-b border-[#DCE5EA] bg-[#FFFFFF] lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:flex-shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="border-b border-[#DCE5EA] px-6 py-6">
          <Link href="/" className="text-xl font-black uppercase tracking-[-0.06em] text-slate-900">SHIVAM<span className="text-[#0F766E]">.</span></Link>
          <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#64748B]">Portfolio control room</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-5 lg:overflow-visible lg:p-5" aria-label="Admin sections">
          {groups.map(group=><div key={group.heading} className="flex shrink-0 gap-1 lg:block">
            <span className="hidden px-3 text-[10px] uppercase tracking-[0.2em] text-[#64748B] lg:mb-2 lg:block">{group.heading}</span>
            {group.items.map(item=><button key={item.key} type="button" onClick={()=>{if(dirty && !(view==='media'&&item.key==='about')){setFail('You have unsaved edits. Save Draft before switching sections.');return;}setView(item.key);setNotice('');setFail('');}}
              className={'whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition lg:my-0.5 lg:block lg:w-full lg:text-sm '+(view===item.key?'bg-[#DFF6EE] text-[#0F766E]':'text-[#51677B] hover:bg-[#F1F5F9] hover:text-slate-900')}>
              {item.label}
            </button>)}
          </div>)}
        </nav>
        <div className="hidden border-t border-[#DCE5EA] px-5 py-5 lg:block">
          <p className="truncate text-xs text-[#64748B]" title={email}>{email}</p>
          <button type="button" onClick={logout} className="mt-3 flex items-center gap-2 text-xs text-[#64748B] hover:text-slate-900"><LogOut size={14}/> Sign out</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE5EA] bg-[#FFFFFF] px-5 py-5 md:px-9">
          <div><div className="text-[11px] uppercase tracking-[0.18em] text-[#64748B]">Admin / {view}{draftKeys.has(view)?' · Saved draft':''}{dirty?' · Unsaved edits':''}</div><h1 className="mt-1 text-xl font-bold capitalize text-slate-900 sm:text-2xl">{view.replace(/-/g,' ')}</h1></div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" target="_blank" rel="noopener noreferrer" className={ui.button}><ExternalLink size={15}/> View website</Link>
            {editable.includes(view as EditableSection)&&<>
              <button type="button" onClick={()=>setPreviewOpen(true)} className={ui.button}><ExternalLink size={15}/> Preview</button>
              {(dirty||draftKeys.has(view))&&<button type="button" onClick={discardDraft} disabled={busy} className={ui.button}>Discard</button>}
              <button type="button" onClick={save} disabled={busy} className={ui.button}><Save size={16}/>{busy?'Saving…':'Save Draft'}</button>
              <button type="button" onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-extrabold text-[#FFFFFF] transition hover:bg-[#115E59] disabled:opacity-50"><Check size={16}/> Publish</button>
            </>}
            <button type="button" onClick={logout} className={ui.button+' lg:hidden'}><LogOut size={15}/></button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-6 md:px-9 md:py-10">
          {notice&&<div role="status" className="flex items-start gap-2 rounded-xl border border-[#DCE5EA] bg-[#ECFDF5] px-4 py-3 text-sm text-[#0F766E]"><Check size={18} className="mt-0.5 shrink-0"/>{notice}</div>}
          {fail&&<div role="alert" className="rounded-xl border border-[#DCE5EA] bg-[#FFF1F2] px-4 py-3 text-sm text-[#B42318]">{fail}</div>}
          {view==='overview'&&<>
            <Panel title="Portfolio workspace" subtitle="Save Draft keeps changes private; Preview shows pending edits, Publish makes them public. No GitHub push is needed for content.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[['Editable sections','9'],['Contact messages',counts.messages===null?'—':String(counts.messages)],['Tracked CV downloads',counts.downloads===null?'—':String(counts.downloads)],['Media files',counts.media===null?'—':String(counts.media)]].map(([k,v])=>
                  <div key={k} className="rounded-xl border border-[#DCE5EA] bg-[#ECFDF5] p-5"><p className="text-xs text-[#64748B]">{k}</p><p className="mt-3 text-4xl font-black text-[#0F766E]">{v}</p></div>)}
              </div>
            </Panel>
            <Panel title="What is ready?" subtitle="Supabase-secured content, media gallery, draft history, theme presets and admin-only records.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[#EAF7F0] p-4"><b className="text-[#0F766E]">✓ Content editor</b><p className="mt-2 text-sm text-[#64748B]">Hero, About, Timeline, Skills, Projects, Navigation, Socials, SEO and full Design Studio.</p></div>
                <div className="rounded-xl bg-[#FFFAEB] p-4"><b className="text-[#9A6700]">⏸ Email workflows paused</b><p className="mt-2 text-sm text-[#8A660F]">Contact notifications and gated CV download delivery are intentionally scheduled for later.</p></div>
              </div>
            </Panel>
          </>}
          {view==='hero'&&<Panel title="Homepage hero" subtitle="Edit your name, introduction and job-role chips. Existing FlowField animation is preserved.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={data.hero.firstName} onChange={v=>change(d=>{d.hero.firstName=v;})}/>
              <Field label="Last name" value={data.hero.lastName} onChange={v=>change(d=>{d.hero.lastName=v;})}/>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Hero description" value={data.hero.description} multiline onChange={v=>change(d=>{d.hero.description=v;})}/>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Typing speed (WPM)" type="number" value={String(data.hero.typingWpm)} onChange={v=>change(d=>{d.hero.typingWpm=Number(v);})}/><Field label="Typing accuracy (%)" type="number" value={String(data.hero.typingAccuracy)} onChange={v=>change(d=>{d.hero.typingAccuracy=Number(v);})}/></div>
               <p className="text-xs text-[#64748B]">These two numbers update in both the homepage highlight and the Skills section.</p>
              <Lines label="Job role chips" items={data.hero.roles} onChange={v=>change(d=>{d.hero.roles=v;})}/>
            </div>
          </Panel>}
          {view==='about'&&<Panel title="About me" subtitle="Portrait remains above the animated FlowField layer. Upload a new cutout using Photo & media.">
            <div className="space-y-4">
              <Field label="Introduction" multiline value={data.about.intro} onChange={v=>change(d=>{d.about.intro=v;})}/>
              <Field label="Biography (blank lines separate paragraphs)" multiline value={data.about.body} onChange={v=>change(d=>{d.about.body=v;})}/>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><Field label="Portrait image URL" value={data.about.photoUrl} onChange={v=>change(d=>{d.about.photoUrl=v;})}/><button type="button" className={ui.button} onClick={()=>setPickerTarget('about')}>Choose from library</button></div>
              {data.about.photoUrl&&<img src={data.about.photoUrl} alt="About preview" className="h-48 w-40 rounded-xl border border-[#DCE5EA] bg-[#F1F5F9] object-contain object-bottom"/>}
            </div>
          </Panel>}
          {view==='timeline'&&<Panel title="Education & career timeline" subtitle="Change the details or reorder milestones. Alternating left/right layout and curved line are preserved.">
            <div className="space-y-4">
              {data.timeline.items.map((item,i)=><div key={i} className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#0F766E]">Milestone {i+1}</h3><Move up={()=>change(d=>{d.timeline.items=move(d.timeline.items,i,i-1);})} down={()=>change(d=>{d.timeline.items=move(d.timeline.items,i,i+1);})} remove={()=>change(d=>{d.timeline.items.splice(i,1);})}/></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(['year','title','organization','type','stat'] as (keyof TimelineEntry)[]).map(k=>
                    <Field key={k} label={k} multiline={k==='stat'} value={item[k]} onChange={v=>change(d=>{d.timeline.items[i][k]=v;})}/>)}
                </div>
              </div>)}
              <button type="button" className={ui.button} onClick={()=>change(d=>{d.timeline.items.push({year:'2026',title:'New milestone',organization:'',stat:'',type:'Career'});})}><Plus size={16}/> Add milestone</button>
            </div>
          </Panel>}
          {view==='skills'&&<Panel title="Skills & services" subtitle="Edit cards, descriptions and skill items.">
            <Field label="Section introduction" multiline value={data.skills.description} onChange={v=>change(d=>{d.skills.description=v;})}/>
            <div className="mt-5 space-y-4">{data.skills.services.map((item,i)=><div key={i} className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-4">
              <div className="mb-4 flex flex-wrap justify-between gap-3"><h3 className="font-semibold text-[#0F766E]">Service {i+1}</h3><Move up={()=>change(d=>{d.skills.services=move(d.skills.services,i,i-1);})} down={()=>change(d=>{d.skills.services=move(d.skills.services,i,i+1);})} remove={()=>change(d=>{d.skills.services.splice(i,1);})}/></div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['id','title','description'] as (keyof SkillEntry)[]).map(k=><Field key={k} label={k} value={String(item[k])} onChange={v=>change(d=>{(d.skills.services[i] as unknown as Record<string,string>)[k]=v;})}/>)}
              </div>
              <div className="mt-4"><Lines label="Skill tags" items={item.items} onChange={v=>change(d=>{d.skills.services[i].items=v;})}/></div>
            </div>)}
              <button className={ui.button} type="button" onClick={()=>change(d=>{d.skills.services.push({id:String(d.skills.services.length+1).padStart(2,'0'),title:'New service',description:'',items:[]});})}><Plus size={16}/> Add service</button>
            </div>
            <h3 className="mb-4 mt-9 border-t border-[#DCE5EA] pt-7 text-lg font-semibold">Tech stack cards & icons</h3>
            <div className="space-y-4">{data.skills.stack.map((group,i)=><div key={i} className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-[#0F766E]">Skill group {i+1}</h4><Move up={()=>change(d=>{d.skills.stack=move(d.skills.stack,i,i-1);})} down={()=>change(d=>{d.skills.stack=move(d.skills.stack,i,i+1);})} remove={()=>change(d=>{d.skills.stack.splice(i,1);})}/></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Group ID" value={group.id} onChange={v=>change(d=>{d.skills.stack[i].id=v;})}/><Field label="Group title" value={group.title} onChange={v=>change(d=>{d.skills.stack[i].title=v;})}/></div>
              <div className="mt-4 space-y-3">{group.technologies.map((item,j)=><div key={j} className="grid gap-2 rounded-lg border border-[#DCE5EA] p-3 sm:grid-cols-[1fr_1fr_auto]"><Field label="Skill name" value={item.name} onChange={v=>change(d=>{d.skills.stack[i].technologies[j].name=v;})}/><Field label="Icon path / URL" value={item.icon} onChange={v=>change(d=>{d.skills.stack[i].technologies[j].icon=v;})}/><button type="button" className={ui.danger} onClick={()=>change(d=>{d.skills.stack[i].technologies.splice(j,1);})}><Trash2 size={16}/></button></div>)}</div>
              <button type="button" className={ui.button+' mt-4'} onClick={()=>change(d=>{d.skills.stack[i].technologies.push({name:'New skill',category:group.id as 'frontend',icon:'/Services/analysis.svg'});})}><Plus size={15}/> Add skill</button>
            </div>)}
            <button type="button" className={ui.button} onClick={()=>change(d=>{d.skills.stack.push({id:'tools',title:'MORE TOOLS',technologies:[]});})}><Plus size={15}/> Add skill group</button></div>
          </Panel>}
          {view==='projects'&&<Panel title="Portfolio projects" subtitle="Create, edit, reorder and remove projects. Screenshot placeholders are left unchanged until you upload real ones.">
            <div className="mb-5 flex flex-wrap gap-2">{data.projects.items.map((p,i)=><button type="button" key={i} className={ui.button+(activeProject===i?' !bg-[#DCFCE7] !text-[#0F766E]':'')} onClick={()=>setActiveProject(i)}>{p.title.slice(0,34)}</button>)}</div>
            {project&&<div className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-4 md:p-5">
              <div className="mb-4 flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-[#0F766E]">Project #{activeProject+1}</h3>
                <Move up={()=>{change(d=>{d.projects.items=move(d.projects.items,activeProject,activeProject-1);});setActiveProject(Math.max(0,activeProject-1));}}
                down={()=>{change(d=>{d.projects.items=move(d.projects.items,activeProject,activeProject+1);});setActiveProject(Math.min(data.projects.items.length-1,activeProject+1));}}
                remove={()=>{change(d=>{d.projects.items.splice(activeProject,1);});setActiveProject(Math.max(0,activeProject-1));}}/>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['title','slug','type','role','description','overview','architecture','implementation','hoverImage','github','liveUrl','accent'] as (keyof Project)[])
                  .map(k=><Field key={k} label={k} multiline={['description','overview','architecture','implementation'].includes(k)} value={String(project[k]||'')}
                    onChange={v=>change(d=>{(d.projects.items[activeProject] as unknown as Record<string,string>)[k]=v;})}/>)}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(['tech','myRole','images'] as (keyof Project)[]).map(k=>
                  <Lines key={k} label={k} items={(project[k] as string[])||[]}
                    onChange={v=>change(d=>{(d.projects.items[activeProject] as unknown as Record<string,string[]>)[k]=v;})}/>)}
              </div>
              <button type="button" className={ui.button+' mt-4'} onClick={()=>setPickerTarget('project')}>Add image from Media Library</button>
              <div className="mt-5 space-y-3"><span className={ui.label}>Project statistics</span>
                {project.stats.map((s,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Field label="Value" value={s.value} onChange={v=>change(d=>{d.projects.items[activeProject].stats[i].value=v;})}/>
                  <Field label="Label" value={s.label} onChange={v=>change(d=>{d.projects.items[activeProject].stats[i].label=v;})}/>
                  <button className={ui.danger} onClick={()=>change(d=>{d.projects.items[activeProject].stats.splice(i,1);})}><Trash2 size={16}/></button>
                </div>)}
                <button type="button" className={ui.button} onClick={()=>change(d=>{d.projects.items[activeProject].stats.push({label:'Metric',value:'0'});})}><Plus size={15}/> Add statistic</button>
              </div>
            </div>}
            <button type="button" className={ui.button+' mt-5'} onClick={()=>{change(d=>{const p=makeProject();p.slug='new-project-'+(d.projects.items.length+1);d.projects.items.push(p);});setActiveProject(data.projects.items.length);}}><Plus size={16}/> Add project</button>
          </Panel>}
          {view==='navigation'&&<Panel title="Header & menu links" subtitle="Anchor links must use the /#section-id format to keep smooth scrolling and transitions working.">
            <div className="space-y-4">{data.navigation.links.map((item,i)=><div key={i} className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-4">
              <div className="mb-3 flex justify-end"><Move up={()=>change(d=>{d.navigation.links=move(d.navigation.links,i,i-1);})} down={()=>change(d=>{d.navigation.links=move(d.navigation.links,i,i+1);})} remove={()=>change(d=>{d.navigation.links.splice(i,1);})}/></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Label" value={item.name} onChange={v=>change(d=>{d.navigation.links[i].name=v;})}/>
                <Field label="Anchor link" value={item.href} onChange={v=>change(d=>{d.navigation.links[i].href=v;})}/>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-[#64748B]"><input type="checkbox" checked={Boolean(item.menuOnly)} onChange={e=>change(d=>{d.navigation.links[i].menuOnly=e.target.checked;})}/> Show in full menu only</label>
            </div>)}
              <button type="button" className={ui.button} onClick={()=>change(d=>{d.navigation.links.push({name:'New link',href:'/#contact'} as MenuLink);})}><Plus size={15}/> Add link</button>
            </div>
          </Panel>}
          {view==='socials'&&<Panel title="Social profile links" subtitle="Public profile URLs only. Private notification email is never stored here.">
            <div className="space-y-4">{(['github','linkedin','instagram'] as const).map(k=>
              <Field key={k} label={k} value={data.socials[k]} onChange={v=>change(d=>{d.socials[k]=v;})}/>)}</div>
          </Panel>}
          {view==='seo'&&<Panel title="SEO & social sharing" subtitle="Control the website title, Google description, canonical URL and WhatsApp/LinkedIn preview image.">
             <div className="space-y-4">
               <Field label="Site title" value={data.seo.title} onChange={v=>change(d=>{d.seo.title=v;})}/>
               <Field label="Meta description" multiline value={data.seo.description} onChange={v=>change(d=>{d.seo.description=v;})}/>
               <Field label="Canonical website URL" value={data.seo.siteUrl} onChange={v=>change(d=>{d.seo.siteUrl=v;})}/>
               <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><Field label="Social preview image URL (1200×630 recommended)" value={data.seo.socialImage} onChange={v=>change(d=>{d.seo.socialImage=v;})}/><button type="button" className={ui.button} onClick={()=>setPickerTarget('seo')}>Choose from library</button></div>
               {data.seo.socialImage&&<img src={data.seo.socialImage} alt="Social card preview" className="h-auto max-h-44 w-full rounded-xl border border-[#DCE5EA] object-contain" />}
               <div className="rounded-xl border border-[#DCE5EA] bg-[#F7FAFC] p-4"><p className="text-xs text-[#64748B]">Search / share preview</p><h3 className="mt-2 text-base font-semibold text-slate-900">{data.seo.title}</h3><p className="mt-1 text-xs text-[#64748B]">{data.seo.siteUrl}</p><p className="mt-2 text-xs text-[#62758A]">{data.seo.description}</p></div>
             </div>
           </Panel>}
           {view==='theme'&&<Panel title="Website Theme & Design Studio" subtitle="Complete colour families, semantic roles, typography, custom presets, contrast checks and rollback. This controls the public website—not this admin panel.">
             <ThemeStudio value={data.theme} onChange={theme=>change(d=>{d.theme=theme;})} presets={presets} onSavePresets={savePresets}/>
           </Panel>}
           {view==='media'&&<Panel title="Media Library" subtitle="Manage your uploaded PNG, JPEG and WebP files. Attach images directly in About, Projects or SEO using the picker—no URL copy-paste.">
             <form onSubmit={upload} className="space-y-4">
               <label className="block"><span className={ui.label}>Use image for</span><select className={ui.input} value={uploadKind} onChange={e=>setUploadKind(e.target.value as 'photo'|'project'|'resume')}><option value="photo">About portrait</option><option value="project">Project / SEO image</option></select></label>
               <input id="admin-file-input" className={ui.input} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/>
               <button disabled={busy||!file} type="submit" className={ui.button}><ImagePlus size={16}/>{busy?'Uploading…':'Upload image'}</button>
             </form>
             {recentImage&&<div className="mt-4 flex items-center gap-3 rounded-xl border border-[#DCE5EA] p-3"><img alt="Recently uploaded" className="h-16 w-16 rounded-lg object-contain" src={recentImage}/><span className="text-xs text-[#64748B]">Latest upload is in the library below.</span></div>}
             <div className="mb-4 mt-7 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900">Saved images ({media.length})</h3><button type="button" className={ui.button} disabled={busy} onClick={()=>refreshMedia().catch(e=>setFail(e.message))}>Refresh</button></div>
             {media.length===0?<p className="rounded-xl border border-[#DCE5EA] p-4 text-sm text-[#64748B]">No images uploaded yet.</p>:
             <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{media.map(item=><article key={item.id} className="overflow-hidden rounded-xl border border-[#DCE5EA] bg-[#FFFFFF]">
               <div className="flex h-40 items-center justify-center bg-[#F1F5F9]"><img className="h-full w-full object-contain" src={item.url} alt={item.alt_text||'Portfolio image'}/></div>
               <div className="space-y-3 p-3">
                 <label className="block"><span className={ui.label}>Image label / alt text</span><input className={ui.input} value={item.alt_text} maxLength={200} onChange={e=>setMedia(old=>old.map(m=>m.id===item.id?{...m,alt_text:e.target.value}:m))}/></label>
                 <div className="flex flex-wrap gap-2"><button type="button" className={ui.button+' !text-xs'} onClick={async()=>{try{await request('/api/admin/media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,alt_text:item.alt_text})});setNotice('Image label saved.');}catch(e){setFail(e instanceof Error?e.message:'Unable to update label');}}}>Save label</button><button type="button" className={ui.danger} disabled={busy} onClick={()=>deleteImage(item.id)}><Trash2 size={13}/> Delete</button></div>
                 <p className="truncate text-[10px] text-[#64748B]" title={item.url}>{item.storage_path}</p>
               </div>
             </article>)}</div>}
           </Panel>}
           {view==='resume'&&<Panel title="Private resume manager" subtitle="PDF is private. Uploading does NOT enable public downloads; the visitor form and alerts have not been enabled yet.">
            <form onSubmit={upload} className="space-y-4"><input id="admin-file-input" className={ui.input} type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setUploadKind('resume');}}/>
              <button disabled={busy||!file} type="submit" className={ui.button}><FileText size={16}/>{busy?'Uploading…':'Upload private PDF'}</button></form>
            <div className="mt-7 space-y-2">{resumes.length===0?<p className="text-sm text-[#64748B]">No resume uploaded yet.</p>:resumes.map(r=>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE5EA] p-3 text-sm" key={r.id}><span className="break-all">{r.display_name}</span><span className={r.is_active?'text-[#0F766E]':'text-[#8CA79A]'}>{r.is_active?'Current':'Older'}</span></div>)}</div>
          </Panel>}
          {view==='inbox'&&<Panel title="Contact inbox" subtitle="Only saved database messages appear here. Email/contact-form integration is paused; existing website emails are not imported.">
            {messages.length===0?<p className="text-sm text-[#64748B]">No saved contact messages yet.</p>:<div className="space-y-3">{messages.map(m=>
              <article key={m.id} className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><b>{m.sender_name}</b><span className="text-xs text-[#64748B]">{new Date(m.created_at).toLocaleString('en-IN')}</span></div>
                <p className="mt-1 text-xs text-[#0F766E]">{m.sender_email}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{m.message}</p>
                <div className="mt-4 flex gap-2">{(['unread','read','archived'] as const).map(s=><button key={s} disabled={busy||m.status===s} className={ui.button+' !px-3 !py-1.5 !text-xs'} onClick={()=>changeMessage(m.id,s)}>{m.status===s?'✓ ':''}{s}</button>)}</div>
              </article>)}</div>}
          </Panel>}
          {view==='downloads'&&<Panel title="CV download history" subtitle="This activity feed will start after we add the gated download endpoint. No download tracking is enabled yet.">
            {downloads.length===0?<p className="text-sm text-[#64748B]">No CV download records yet.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="text-xs uppercase text-[#64748B]"><tr><th className="p-3">Visitor</th><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Date</th></tr></thead><tbody>{downloads.map(d=><tr className="border-t border-[#DCE5EA]" key={d.id}><td className="p-3">{d.visitor_name}</td><td className="p-3">{d.company_name}</td><td className="p-3">{d.contact_email||d.contact_phone||'—'}</td><td className="p-3">{new Date(d.downloaded_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>}
          </Panel>}
          {editable.includes(view as EditableSection)&&<Panel title="Published version history" subtitle="Each Publish creates a snapshot. Restore copies an older version into Draft; the live website changes only after you Publish it.">
            <button type="button" className={ui.button+' mb-4'} onClick={()=>{
              if(!window.confirm('Load original default content into the editor? Save Draft and Publish to apply it.'))return;
              change(d=>{(d as unknown as Record<string,unknown>)[view]=structuredClone(portfolioDefaults[view as EditableSection]);});
            }}>Restore original defaults to editor</button>
            <div className="space-y-2">
              {versions.filter(v=>v.section_key===view).length===0?<p className="text-sm text-[#64748B]">No published history yet. Your first Publish will create one.</p>:
                versions.filter(v=>v.section_key===view).slice(0,20).map((version,i)=><div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] px-4 py-3">
                  <div><p className="text-sm font-semibold text-slate-900">{i===0?'Latest published snapshot':'Published version #'+version.id}</p><p className="mt-1 text-xs text-[#64748B]">{new Date(version.published_at).toLocaleString('en-IN')}</p></div>
                  <button type="button" className={ui.button} disabled={busy} onClick={()=>restoreVersion(version.id)}>Restore to Draft</button>
                </div>)}
            </div>
          </Panel>}
          <p className="pb-4 text-xs leading-6 text-[#64748B]">Security: only Supabase-authorized admins can save content or access private records. Drafts stay private; only Publish updates the public website. Email notifications remain paused.</p>
        </div>
      </div>
    </div>
    {previewOpen&&<div className="fixed inset-0 z-[100] overflow-auto bg-[#F6F8FB] p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Draft website preview">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE5EA] bg-[#F8FAFC] p-4">
          <div><h2 className="font-semibold text-slate-900">Live draft preview</h2><p className="mt-1 text-xs text-[#64748B]">Unsaved edits appear here, but visitors still see the published site.</p></div>
          <div className="flex flex-wrap gap-2"><button className={ui.button} type="button" onClick={()=>setPreviewWidth('desktop')}>Desktop</button><button className={ui.button} type="button" onClick={()=>setPreviewWidth('mobile')}>Mobile</button><button className={ui.button} type="button" onClick={()=>setPreviewOpen(false)}>Close preview ✕</button></div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#DCE5EA] bg-[#F3F7FA] p-2">
          <iframe ref={previewRef} title="Private portfolio preview" src="/admin/preview" onLoad={sendPreview}
            className={'mx-auto block h-[78vh] min-h-[520px] rounded-lg border border-[#DCE5EA] bg-[#F3F7FA] '+(previewWidth==='mobile'?'w-[390px]':'w-full')}/>
        </div>
      </div>
    </div>}
    {pickerTarget&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Choose portfolio image">
      <div className="max-h-[86vh] w-full max-w-4xl overflow-auto rounded-2xl border border-[#DCE5EA] bg-[#FFFFFF] p-5">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Choose image from Media Library</h2><p className="mt-1 text-xs text-[#64748B]">Select a thumbnail to attach it to {pickerTarget==='about'?'About Me':pickerTarget==='seo'?'the social preview':'this project'}.</p></div><button type="button" className={ui.button} onClick={()=>setPickerTarget(null)}>Close ✕</button></div>
        {media.length===0?<p className="rounded-xl border border-[#DCE5EA] p-5 text-sm">No images available. Close the picker and upload an image in Media Library first.</p>:<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">{media.map(item=><button key={item.id} type="button" onClick={()=>attachImage(item.url)} className="overflow-hidden rounded-xl border border-[#DCE5EA] bg-[#F8FAFC] text-left transition hover:border-[#0F766E]">
          <img src={item.url} alt={item.alt_text||'Portfolio image'} className="h-36 w-full object-contain"/><span className="block truncate p-3 text-xs text-slate-900">{item.alt_text||item.storage_path}</span>
        </button>)}</div>}
      </div>
    </div>}
  </main>;
}
