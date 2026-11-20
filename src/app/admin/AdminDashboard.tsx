'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, ExternalLink, FileText, ImagePlus, LogOut, Plus, Save, ShieldCheck, Trash2, Search, LayoutDashboard, Inbox, Activity, House, UserRound, Clock3, Blocks, FolderKanban, Menu, Share2, SearchCheck, Palette, Images, Copy, RotateCcw, X, type LucideIcon } from 'lucide-react';
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
const navIcons:Record<View,LucideIcon>={
  overview:LayoutDashboard,inbox:Inbox,downloads:Activity,hero:House,about:UserRound,timeline:Clock3,
  skills:Blocks,projects:FolderKanban,navigation:Menu,socials:Share2,seo:SearchCheck,theme:Palette,
  media:Images,resume:FileText,
};
const pageGuides:Record<View,string>={
  overview:'Your portfolio at a glance. Jump to an editor or check pending drafts.',
  inbox:'Read, filter, and organize incoming messages. Delivery integration is still paused.',
  downloads:'Review CV download activity once the gated workflow is connected.',
  hero:'Update your name, introduction, job chips and typing highlights.',
  about:'Edit your story and choose the portrait that appears on the public site.',
  timeline:'Organize education and career milestones in the order visitors see.',
  skills:'Manage services, skill tags, grouped tools and technology icons.',
  projects:'Create polished project case studies, screenshots and statistics.',
  navigation:'Customize the labels and order of your website menu.',
  socials:'Keep links to your public profiles current.',
  seo:'Customize search listings, social-sharing previews and canonical links.',
  theme:'Create and preview complete website palettes and custom presets.',
  media:'Browse, upload, label, and safely organize portfolio images.',
  resume:'Upload private CV versions; public download access stays disabled.',
};
const ui={
  label:'mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]',
  input:'admin-field w-full rounded-xl px-4 py-3 text-sm outline-none',
  card:'admin-card rounded-2xl p-5 md:p-7',
  button:'admin-button inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50',
  danger:'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#B42318] hover:bg-[#FFF1F2]/40',
};
function Field({label,value,onChange,multiline=false,placeholder='',type='text',hint,maxLength}:{
  label:string;value:string;onChange:(v:string)=>void;multiline?:boolean;placeholder?:string;type?:string;hint?:string;maxLength?:number
}){
  return <label className="block">
    <span className={ui.label}>{label}</span>
    {multiline
      ? <textarea rows={4} className={ui.input+' min-h-[120px] resize-y'} placeholder={placeholder} value={value} maxLength={maxLength} onChange={e=>onChange(e.target.value)}/>
      : <input className={ui.input} type={type} placeholder={placeholder} value={value} maxLength={maxLength} onChange={e=>onChange(e.target.value)}/>
    }
    {(hint||multiline||maxLength)&&<span className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
      <span>{hint||''}</span><span>{maxLength?`${value.length}/${maxLength}`:multiline?`${value.length} characters`:''}</span>
    </span>}
  </label>;
}
function Lines({label,items,onChange}:{label:string;items:string[];onChange:(v:string[])=>void}){
  return <div className="space-y-2">
    <Field label={label+' (one per line)'} multiline value={items.join('\n')} onChange={v=>onChange(v.split('\n').map(s=>s.trim()).filter(Boolean))} hint={`${items.length} item${items.length===1?'':'s'} · One item per line`}/>
    {items.length>0&&<div className="flex flex-wrap gap-1.5">{items.slice(0,10).map((item,i)=><span key={i} className="admin-chip max-w-full truncate">{item}</span>)}{items.length>10&&<span className="admin-chip">+${items.length-10}</span>}</div>}
  </div>;
}
function Panel({title,subtitle,children}:{title:string;subtitle?:string;children:ReactNode}){
  return <section className={ui.card}>
    <div className="admin-panel-intro">
      <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{title}</h2>
      {subtitle&&<p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </section>;
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
  const [navSearch,setNavSearch]=useState('');
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
  const [projectSearch,setProjectSearch]=useState('');
  const [mediaSearch,setMediaSearch]=useState('');
  const [inboxSearch,setInboxSearch]=useState('');
  const [inboxStatus,setInboxStatus]=useState<'all'|'unread'|'read'|'archived'>('all');
  const [downloadsSearch,setDownloadsSearch]=useState('');

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
  const matchingProjects=data.projects.items.map((p,index)=>({...p,index}))
    .filter(p=>[p.title,p.type,p.role,...p.tech].join(' ').toLowerCase().includes(projectSearch.trim().toLowerCase()));
  const filteredMedia=media.filter(item=>[item.alt_text,item.storage_path].join(' ').toLowerCase().includes(mediaSearch.trim().toLowerCase()));
  const filteredMessages=messages.filter(item=>(inboxStatus==='all'||item.status===inboxStatus)&&[item.sender_name,item.sender_email,item.message].join(' ').toLowerCase().includes(inboxSearch.trim().toLowerCase()));
  const filteredDownloads=downloads.filter(item=>[item.visitor_name,item.company_name,item.contact_email||'',item.contact_phone||''].join(' ').toLowerCase().includes(downloadsSearch.trim().toLowerCase()));
  const openView=(key:View)=>{
    if(dirty&&!(view==='media'&&key==='about')){setFail('Unsaved edits: save your draft before switching sections.');return;}
    setView(key);setNotice('');setFail('');
  };
  const duplicateProject=()=>{
    if(!project)return;
    const copy=structuredClone(project);
    copy.id=Date.now();
    copy.slug=`${copy.slug.replace(/-copy(?:-\d+)?$/,'')}-copy-${Date.now().toString(36)}`;
    copy.title+= ' (Copy)';
    change(d=>{d.projects.items.splice(activeProject+1,0,copy);});
    setActiveProject(activeProject+1);
  };
  const duplicateTimeline=(index:number)=>change(d=>{d.timeline.items.splice(index+1,0,structuredClone(d.timeline.items[index]));});
  const duplicateService=(index:number)=>change(d=>{const copy=structuredClone(d.skills.services[index]);copy.id=String(Date.now()).slice(-6);d.skills.services.splice(index+1,0,copy);});
  const copyText=async(value:string,label='Link')=>{
    try{await navigator.clipboard.writeText(value);setNotice(label+' copied to clipboard.');}
    catch{setFail('Clipboard unavailable. Select and copy the text manually.');}
  };

  if(session==='checking') return <main className="admin-shell flex min-h-screen items-center justify-center bg-[#F6F8FB] text-[#0F766E]">Verifying admin session…</main>;
  if(session==='guest')return <main className="admin-shell relative flex min-h-screen items-center justify-center bg-[#F6F8FB] p-5 text-[#162536]">
    <div className="absolute left-6 top-6 text-sm font-black uppercase tracking-widest text-[#0F766E]">SHIVAM / ADMIN</div>
    <form onSubmit={login} className="admin-card w-full max-w-md rounded-3xl border border-[#DCE5EA] bg-[#FFFFFF] p-7 shadow-xl sm:p-10">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF7F0] text-[#0F766E]"><ShieldCheck size={29}/></div>
      <h1 className="text-3xl font-black tracking-tight">Welcome back.</h1>
      <p className="mt-2 mb-8 text-sm leading-6 text-[#64748B]">Sign in with your authorized Supabase admin account. The portfolio remains public; editing is private.</p>
      <div className="space-y-5">
        <Field label="Admin email" value={email} onChange={setEmail} type="email" placeholder="you@example.com"/>
        <label className="block"><span className={ui.label}>Password</span><input className={ui.input} value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required minLength={6}/></label>
      </div>
      {loginError&&<p role="alert" className="mt-5 rounded-xl bg-red-950/40 p-3 text-sm text-red-200">{loginError}</p>}
      <button disabled={busy||!email||!password} className="admin-primary mt-7 w-full rounded-xl px-5 py-3.5 font-bold text-white disabled:opacity-50">{busy?'Signing in…':'Sign in securely →'}</button>
      <Link href="/" className="mt-5 block text-center text-xs text-[#64748B] hover:text-slate-900">← Back to portfolio</Link>
    </form>
  </main>;
  return <main className="admin-shell min-h-screen bg-[#F6F8FB] font-sans text-[#162536]">
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="admin-sidebar admin-scrollbar w-full border-b border-[#DCE5EA] bg-white lg:sticky lg:top-0 lg:h-screen lg:w-[272px] lg:flex-shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="border-b border-[#DCE5EA] px-6 py-6">
          <Link href="/" className="text-xl font-black uppercase tracking-[-0.06em] text-slate-900">SHIVAM<span className="text-[#0F766E]">.</span></Link>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#64748B]">Portfolio Studio · Admin</p>
        </div>
        <div className="px-3 pt-4 lg:px-5">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <span className="sr-only">Find editor panel</span>
            <input className="admin-sidebar-search w-full rounded-xl py-2.5 pl-9 pr-3 text-sm" value={navSearch} onChange={e=>setNavSearch(e.target.value)} placeholder="Find a section..."/>
          </label>
        </div>
        <nav className="admin-scrollbar flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-5 lg:overflow-visible lg:p-5" aria-label="Admin sections">
          {groups.map(group=>({...group,items:group.items.filter(item=>item.label.toLowerCase().includes(navSearch.trim().toLowerCase()))})).filter(group=>group.items.length>0).map(group=><div key={group.heading} className="flex shrink-0 gap-1 lg:block">
            <span className="hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:mb-2 lg:block">{group.heading}</span>
            {group.items.map(item=><button key={item.key} type="button" aria-current={view===item.key?'page':undefined}
              onClick={()=>{if(view===item.key)return;if(dirty&&!(view==='media'&&item.key==='about')){setFail('Unsaved edits: save your draft before switching sections.');return;}setView(item.key);setNotice('');setFail('');}}
              className={'admin-nav-item whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-xs font-semibold lg:my-0.5 lg:w-full lg:text-sm '+(view===item.key?'admin-nav-active':'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
              {(() => {const Icon=navIcons[item.key];return <Icon size={16} className="shrink-0 opacity-80"/>;})()}
              <span className="flex-1">{item.label}</span>
              {draftKeys.has(item.key)&&<span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Saved draft"/>}
            </button>)}
          </div>)}
          {groups.every(group=>!group.items.some(item=>item.label.toLowerCase().includes(navSearch.trim().toLowerCase())))&&<p className="px-3 py-4 text-xs text-slate-500">No sections match your search.</p>}
        </nav>
        <div className="hidden border-t border-[#DCE5EA] px-5 py-5 lg:block">
          <p className="truncate text-xs text-[#64748B]" title={email}>{email}</p>
          <button type="button" onClick={logout} className="mt-3 flex items-center gap-2 text-xs text-[#64748B] hover:text-slate-900"><LogOut size={14}/> Sign out</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="admin-topbar flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE5EA] bg-white px-5 py-5 md:px-9">
          <div className="max-w-xl">
             <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400"><span>Workspace / {view}</span>{dirty&&<span className="admin-chip admin-chip-draft">Unsaved changes</span>}{!dirty&&draftKeys.has(view)&&<span className="admin-chip admin-chip-saved">Private draft</span>}</div>
             <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{groups.flatMap(group=>group.items).find(item=>item.key===view)?.label||view}</h1>
             <p className="mt-1 text-xs leading-5 text-slate-500">{pageGuides[view]}</p>
           </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" target="_blank" rel="noopener noreferrer" className={ui.button}><ExternalLink size={15}/> View website</Link>
            {editable.includes(view as EditableSection)&&<>
              <button type="button" onClick={()=>setPreviewOpen(true)} className={ui.button}><ExternalLink size={15}/> Preview</button>
              {(dirty||draftKeys.has(view))&&<button type="button" onClick={discardDraft} disabled={busy} className={ui.button}>Discard</button>}
              <button type="button" onClick={save} disabled={busy} className={ui.button}><Save size={16}/>{busy?'Saving…':'Save Draft'}</button>
              <button type="button" onClick={publish} disabled={busy} className="admin-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"><Check size={16}/> Publish</button>
            </>}
            <button type="button" onClick={logout} className={ui.button+' lg:hidden'}><LogOut size={15}/></button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6 md:px-9 md:py-10">
          {notice&&<div role="status" className="admin-toast flex items-start gap-2 rounded-xl border border-[#DCE5EA] bg-[#ECFDF5] px-4 py-3 text-sm text-[#0F766E]"><Check size={18} className="mt-0.5 shrink-0"/>{notice}</div>}
          {fail&&<div role="alert" className="admin-toast rounded-xl border border-[#DCE5EA] bg-[#FFF1F2] px-4 py-3 text-sm text-[#B42318]">{fail}</div>}
          {view==='overview'&&<>
            <div className="relative overflow-hidden rounded-[26px] border border-[#C9E9DD] bg-gradient-to-br from-[#ECFDF5] via-white to-[#F0F7FF] px-6 py-7 shadow-sm sm:px-8">
              <span className="admin-chip admin-chip-saved">PORTFOLIO STUDIO</span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Your website, in your hands.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Edit freely, inspect changes privately, and publish when ready. Your visitors only see published content.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className={ui.button} onClick={()=>openView('hero')}><House size={16}/> Edit homepage</button>
                <button type="button" className={ui.button} onClick={()=>openView('projects')}><FolderKanban size={16}/> Manage projects</button>
                <button type="button" className={ui.button} onClick={()=>openView('theme')}><Palette size={16}/> Theme Studio</button>
                <Link href="/" target="_blank" className={ui.button}><ExternalLink size={16}/> View website</Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {([
                ['Editable sections',String(editable.length),LayoutDashboard],
                ['Pending drafts',String(draftKeys.size),Save],
                ['Inbox messages',counts.messages===null?'—':String(counts.messages),Inbox],
                ['CV downloads',counts.downloads===null?'—':String(counts.downloads),Activity],
              ] as [string,string,LucideIcon][]).map(([label,value,Icon])=><div key={label} className="admin-stat rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">{label}</span><Icon size={19} className="text-teal-700"/></div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
              </div>)}
            </div>
            <Panel title="Jump into an editor" subtitle="Every control is organized by what you want to update.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {([
                  ['hero','Homepage','Name and typing stats'],
                  ['about','About me','Biography and portrait'],
                  ['projects','Projects','Project case studies'],
                  ['theme','Website colours','Palettes and fonts'],
                  ['media','Media Library','Images and files'],
                  ['seo','SEO & sharing','Google and social preview'],
                ] as [View,string,string][]).map(([key,label,detail])=>{
                  const Icon=navIcons[key];
                  return <button type="button" key={key} onClick={()=>openView(key)}
                    className="admin-item group flex items-center gap-3 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon size={19}/></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span>
                    <span className="text-slate-400 group-hover:text-teal-700">›</span>
                  </button>;
                })}
              </div>
            </Panel>
            <Panel title="Publishing checklist" subtitle="Quick checks before sharing your portfolio.">
              <div className="grid gap-3 lg:grid-cols-3">
                {([
                  ['Profile photo',Boolean(data.about.photoUrl),'about','Portrait is selected'],
                  ['SEO description',Boolean(data.seo.title&&data.seo.description),'seo','Title and description'],
                  ['Project case studies',data.projects.items.length>0,'projects','Titles, links and screenshots'],
                ] as [string,boolean,View,string][]).map(([label,done,target,detail])=><button type="button" key={label} onClick={()=>openView(target)}
                  className="admin-item flex items-start gap-3 text-left">
                  <span className={'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full '+(done?'bg-emerald-100 text-teal-700':'bg-amber-100 text-amber-700')}>{done?'✓':'!'}</span>
                  <span><strong className="block text-sm text-slate-800">{label}</strong><span className="mt-1 block text-xs text-slate-500">{detail}</span></span>
                </button>)}
              </div>
              <p className="mt-4 text-xs text-slate-500">Email notifications and gated CV delivery are paused. Counts reflect database records.</p>
            </Panel>
          </>}
          {view==='hero'&&<>
            <div className="admin-item bg-gradient-to-br from-teal-50 to-white p-6">
              <span className="text-[11px] font-bold uppercase tracking-widest text-teal-700">HOMEPAGE QUICK PREVIEW</span>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">{data.hero.firstName} <span className="text-teal-700">{data.hero.lastName}</span></h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{data.hero.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{data.hero.roles.map((role,i)=><span key={i} className="admin-chip">{role}</span>)}</div>
            </div>
            <Panel title="Homepage hero" subtitle="Edit your name, introduction and job-role chips. The animations stay intact.">
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
          </Panel></>}
          {view==='about'&&<Panel title="About me" subtitle="Write your story, check how it reads, and manage your portrait without touching the page animation.">
             <div className="admin-note mb-5 rounded-xl p-3 text-xs">Portrait uploads are managed in the Media Library. Your existing About content stays in Supabase until you publish a new version.</div>
            <div className="space-y-4">
              <Field label="Introduction" multiline value={data.about.intro} onChange={v=>change(d=>{d.about.intro=v;})}/>
              <Field label="Biography (blank lines separate paragraphs)" multiline value={data.about.body} onChange={v=>change(d=>{d.about.body=v;})}/>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><Field label="Portrait image URL" value={data.about.photoUrl} onChange={v=>change(d=>{d.about.photoUrl=v;})}/><button type="button" className={ui.button} onClick={()=>setPickerTarget('about')}>Choose from library</button></div>
              <div className="admin-inset flex flex-wrap items-center gap-5 p-4">
                 {data.about.photoUrl?<img src={data.about.photoUrl} alt="Current About portrait" className="h-40 w-32 rounded-xl border border-slate-200 bg-white object-contain object-bottom"/>:<div className="flex h-40 w-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white"><Images size={32} className="text-slate-300"/></div>}
                 <div className="space-y-2"><h3 className="font-bold text-slate-800">Portrait preview</h3><p className="max-w-sm text-xs leading-5 text-slate-500">{data.about.photoUrl?'This image is selected for the About section.':'No portrait selected. Choose one from your library.'}</p>
                   <div className="flex flex-wrap gap-2"><button type="button" className={ui.button+' !text-xs'} onClick={()=>setPickerTarget('about')}>Choose image</button>{data.about.photoUrl&&<button type="button" className={ui.button+' !text-xs'} onClick={()=>change(d=>{d.about.photoUrl='';})}>Clear image</button>}</div>
                 </div>
               </div>
            </div>
          </Panel>}
          {view==='timeline'&&<Panel title="Education & career timeline" subtitle="Reorder, duplicate and edit milestones. Changes won't go public until Publish.">
            <div className="admin-note mb-5 rounded-xl p-3 text-xs">{data.timeline.items.length} milestones · The order below matches the website timeline.</div>
            <div className="space-y-4">
              {data.timeline.items.map((item,i)=><div key={i} className="admin-item">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-bold text-teal-700">Milestone {i+1} <span className="font-normal text-slate-500">· {item.year}</span></h3><p className="mt-1 text-xs text-slate-500">{item.title||'Untitled milestone'}</p></div>
                  <button type="button" className={ui.button+' !px-3 !py-2 !text-xs'} onClick={()=>duplicateTimeline(i)}><Copy size={14}/> Duplicate</button>
                  <Move up={()=>change(d=>{d.timeline.items=move(d.timeline.items,i,i-1);})} down={()=>change(d=>{d.timeline.items=move(d.timeline.items,i,i+1);})} remove={()=>change(d=>{d.timeline.items.splice(i,1);})}/></div>
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
            <div className="admin-note mt-4 rounded-xl p-3 text-xs">{data.skills.services.length} service cards · {data.skills.stack.reduce((total,g)=>total+g.technologies.length,0)} tools in {data.skills.stack.length} categories.</div>
            <div className="mt-5 space-y-4">{data.skills.services.map((item,i)=><div key={i} className="admin-item">
              <div className="mb-4 flex flex-wrap justify-between gap-3"><h3 className="font-semibold text-teal-700">Service {i+1} <span className="text-xs font-normal text-slate-500">· {item.title}</span></h3>
                <button type="button" className={ui.button+' !px-3 !py-1.5 !text-xs'} onClick={()=>duplicateService(i)}><Copy size={14}/> Duplicate</button>
                <Move up={()=>change(d=>{d.skills.services=move(d.skills.services,i,i-1);})} down={()=>change(d=>{d.skills.services=move(d.skills.services,i,i+1);})} remove={()=>change(d=>{d.skills.services.splice(i,1);})}/></div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['id','title','description'] as (keyof SkillEntry)[]).map(k=><Field key={k} label={k} value={String(item[k])} onChange={v=>change(d=>{(d.skills.services[i] as unknown as Record<string,string>)[k]=v;})}/>)}
              </div>
              <div className="mt-4"><Lines label="Skill tags" items={item.items} onChange={v=>change(d=>{d.skills.services[i].items=v;})}/></div>
            </div>)}
              <button className={ui.button} type="button" onClick={()=>change(d=>{d.skills.services.push({id:String(d.skills.services.length+1).padStart(2,'0'),title:'New service',description:'',items:[]});})}><Plus size={16}/> Add service</button>
            </div>
            <h3 className="mb-4 mt-9 border-t border-[#DCE5EA] pt-7 text-lg font-semibold">Tech stack cards & icons</h3>
            <div className="space-y-4">{data.skills.stack.map((group,i)=><div key={i} className="admin-item">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-[#0F766E]">Skill group {i+1}</h4><Move up={()=>change(d=>{d.skills.stack=move(d.skills.stack,i,i-1);})} down={()=>change(d=>{d.skills.stack=move(d.skills.stack,i,i+1);})} remove={()=>change(d=>{d.skills.stack.splice(i,1);})}/></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Group ID" value={group.id} onChange={v=>change(d=>{d.skills.stack[i].id=v;})}/><Field label="Group title" value={group.title} onChange={v=>change(d=>{d.skills.stack[i].title=v;})}/></div>
              <div className="mt-4 space-y-3">{group.technologies.map((item,j)=><div key={j} className="grid gap-2 rounded-lg border border-[#DCE5EA] p-3 sm:grid-cols-[1fr_1fr_auto]"><Field label="Skill name" value={item.name} onChange={v=>change(d=>{d.skills.stack[i].technologies[j].name=v;})}/><Field label="Icon path / URL" value={item.icon} onChange={v=>change(d=>{d.skills.stack[i].technologies[j].icon=v;})}/><button type="button" className={ui.danger} onClick={()=>change(d=>{d.skills.stack[i].technologies.splice(j,1);})}><Trash2 size={16}/></button></div>)}</div>
              <button type="button" className={ui.button+' mt-4'} onClick={()=>change(d=>{d.skills.stack[i].technologies.push({name:'New skill',category:group.id as 'frontend',icon:'/Services/analysis.svg'});})}><Plus size={15}/> Add skill</button>
            </div>)}
            <button type="button" className={ui.button} onClick={()=>change(d=>{d.skills.stack.push({id:'tools',title:'MORE TOOLS',technologies:[]});})}><Plus size={15}/> Add skill group</button></div>
          </Panel>}
          {view==='projects'&&<Panel title="Portfolio projects" subtitle="Search, duplicate, reorder and edit each case study. Images stay as placeholders until you upload screenshots.">
            <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="relative block"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><span className="sr-only">Search projects</span><input className={ui.input+' !pl-10'} placeholder="Search title, role, or tools..." value={projectSearch} onChange={e=>setProjectSearch(e.target.value)}/></label>
              <span className="admin-chip self-center">{data.projects.items.length} total projects</span>
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              {matchingProjects.map(p=><button type="button" key={p.id} className={ui.button+(activeProject===p.index?' !border-teal-300 !bg-teal-50 !text-teal-800':'')} onClick={()=>setActiveProject(p.index)}>{p.title.slice(0,34)}</button>)}
              {matchingProjects.length===0&&<p className="text-sm text-slate-500">No projects match. Try a different search.</p>}
            </div>
            {project&&<div className="rounded-xl border border-[#DCE5EA] bg-[#FFFFFF] p-4 md:p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div><h3 className="font-bold text-teal-700">Project #{activeProject+1} · {project.title}</h3><p className="mt-1 text-xs text-slate-500">Unique slug: {project.slug}</p></div>
                  <button type="button" className={ui.button+' !text-xs'} onClick={duplicateProject}><Copy size={14}/> Duplicate project</button>
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
              <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button type="button" className={ui.button} onClick={()=>setPickerTarget('project')}><Images size={15}/> Add image from library</button>
                  <Link target="_blank" href={'/projects/'+project.slug} className={ui.button}><ExternalLink size={15}/> View published project</Link>
                  {project.github&&<a href={project.github} target="_blank" rel="noopener noreferrer" className={ui.button}><ExternalLink size={15}/> GitHub</a>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{project.images.map((url,i)=><div key={url+'-'+i} className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="relative h-32"><img alt={project.title+' screenshot '+(i+1)} src={url} className="h-full w-full object-contain"/></div>
                  <div className="flex items-center justify-between gap-1 p-2">
                    <button type="button" className="text-xs font-semibold text-teal-700 hover:underline" onClick={()=>change(d=>{d.projects.items[activeProject].hoverImage=url;})}>{project.hoverImage===url?'✓ Cover':'Set cover'}</button>
                    <button type="button" className="text-xs font-semibold text-rose-600 disabled:opacity-30" disabled={project.images.length<=1} onClick={()=>change(d=>{d.projects.items[activeProject].images.splice(i,1);if(d.projects.items[activeProject].hoverImage===url)d.projects.items[activeProject].hoverImage=d.projects.items[activeProject].images[0];})}>Remove</button>
                  </div>
                </div>)}</div>
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
          {view==='navigation'&&<Panel title="Header & menu links" subtitle="Reorder your links and decide which ones appear in the expanded menu.">
            <div className="admin-inset mb-5 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Menu preview</p>
              <div className="flex flex-wrap items-center gap-2">{data.navigation.links.filter(l=>!l.menuOnly).map((l,i)=><span key={i} className="admin-chip !bg-white !text-teal-700">{l.name}</span>)}
                {data.navigation.links.filter(l=>!l.menuOnly).length===0&&<span className="text-xs text-amber-700">All links are menu-only.</span>}
              </div>
              <p className="mt-3 text-xs text-slate-500">Anchor links must use /#section-id. Menu-only links still appear in the expanded menu.</p>
            </div>
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
          {view==='socials'&&<Panel title="Social profile links" subtitle="Update your public profiles and test that every URL opens the correct account.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(['github','linkedin','instagram'] as const).map(k=><div key={k} className="admin-item space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold capitalize text-slate-800">{k}</h3>
                  <span className={'admin-chip '+(data.socials[k].startsWith('https://')?'admin-chip-saved':'admin-chip-draft')}>{data.socials[k].startsWith('https://')?'Valid format':'Check URL'}</span>
                </div>
                <Field label="Profile URL" type="url" value={data.socials[k]} onChange={v=>change(d=>{d.socials[k]=v;})}/>
                <div className="flex flex-wrap gap-2">
                  {data.socials[k].startsWith('https://')&&<a href={data.socials[k]} target="_blank" rel="noopener noreferrer" className={ui.button+' !text-xs'}><ExternalLink size={14}/> Open profile</a>}
                  <button type="button" className={ui.button+' !text-xs'} disabled={!data.socials[k]} onClick={()=>copyText(data.socials[k],k+' URL')}><Copy size={14}/> Copy</button>
                </div>
              </div>)}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">Only public profile links belong here. Private notification addresses are never shown on your website.</p>
          </Panel>}
          {view==='seo'&&<Panel title="SEO & social sharing" subtitle="Control the website title, Google description, canonical URL and WhatsApp/LinkedIn preview image.">
             <div className="space-y-4">
               <Field label="Site title" maxLength={180} hint="Aim for a concise, recognizable page title." value={data.seo.title} onChange={v=>change(d=>{d.seo.title=v;})}/>
               <Field label="Meta description" multiline maxLength={400} hint="Keep important words near the beginning; search engines may truncate this." value={data.seo.description} onChange={v=>change(d=>{d.seo.description=v;})}/>
               <Field label="Canonical website URL" type="url" hint="The canonical public domain used for search indexing." value={data.seo.siteUrl} onChange={v=>change(d=>{d.seo.siteUrl=v;})}/>
               <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><Field label="Social preview image URL (1200×630 recommended)" value={data.seo.socialImage} onChange={v=>change(d=>{d.seo.socialImage=v;})}/><button type="button" className={ui.button} onClick={()=>setPickerTarget('seo')}>Choose from library</button></div>
               {data.seo.socialImage&&<img src={data.seo.socialImage} alt="Social card preview" className="h-auto max-h-44 w-full rounded-xl border border-[#DCE5EA] object-contain" />}
               <div className="rounded-xl border border-[#DCE5EA] bg-white p-5 shadow-sm"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Search / share preview</p><h3 className="mt-2 text-base font-semibold text-slate-900">{data.seo.title}</h3><p className="mt-1 text-xs text-[#64748B]">{data.seo.siteUrl}</p><p className="mt-2 text-xs text-[#62758A]">{data.seo.description}</p></div>
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
             <div className="mb-4 mt-7 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-900">Saved images ({media.length})</h3><p className="mt-1 text-xs text-slate-500">Upload once, attach anywhere in your portfolio.</p></div><button type="button" className={ui.button} disabled={busy} onClick={()=>refreshMedia().catch(e=>setFail(e.message))}><RotateCcw size={15}/> Refresh</button></div>
             <label className="relative mb-5 block"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><span className="sr-only">Filter images</span><input className={ui.input+' !pl-10'} value={mediaSearch} onChange={e=>setMediaSearch(e.target.value)} placeholder="Search image names or paths..."/></label>
             {filteredMedia.length===0?<p className="admin-inset p-5 text-sm text-slate-500">{media.length===0?'No images uploaded yet. Use the upload form above to add your first photo.':'No images match that search.'}</p>:
             <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredMedia.map(item=><article key={item.id} className="overflow-hidden rounded-xl border border-[#DCE5EA] bg-[#FFFFFF]">
               <div className="flex h-40 items-center justify-center bg-[#F1F5F9]"><img className="h-full w-full object-contain" src={item.url} alt={item.alt_text||'Portfolio image'}/></div>
               <div className="space-y-3 p-3">
                 <label className="block"><span className={ui.label}>Image label / alt text</span><input className={ui.input} value={item.alt_text} maxLength={200} onChange={e=>setMedia(old=>old.map(m=>m.id===item.id?{...m,alt_text:e.target.value}:m))}/></label>
                 <div className="flex flex-wrap gap-2"><button type="button" className={ui.button+' !text-xs'} onClick={async()=>{try{await request('/api/admin/media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,alt_text:item.alt_text})});setNotice('Image label saved.');}catch(e){setFail(e instanceof Error?e.message:'Unable to update label');}}}>Save label</button><button type="button" className={ui.button+' !text-xs'} onClick={()=>copyText(item.url,'Image URL')}><Copy size={14}/> Copy URL</button>
                 <button type="button" className={ui.danger} disabled={busy} onClick={()=>deleteImage(item.id)}><Trash2 size={13}/> Delete</button></div>
                 <p className="truncate text-[10px] text-[#64748B]" title={item.url}>{item.storage_path}</p>
               </div>
             </article>)}</div>}
           </Panel>}
           {view==='resume'&&<Panel title="Private resume manager" subtitle="Keep a private archive of CV versions and see which PDF is currently active.">
            <div className="admin-note mb-5 rounded-xl p-4 text-sm"><strong className="block text-teal-800">Private storage enabled</strong><p className="mt-1 text-xs leading-5">Uploading a resume saves it in a private Supabase bucket. Public visitor downloads are still disabled until that workflow is enabled.</p></div>
            <form onSubmit={upload} className="space-y-4"><input id="admin-file-input" className={ui.input} type="file" accept="application/pdf" onChange={e=>{setFile(e.target.files?.[0]||null);setUploadKind('resume');}}/>
              <button disabled={busy||!file} type="submit" className={ui.button}><FileText size={16}/>{busy?'Uploading…':'Upload private PDF'}</button></form>
            <div className="mt-7 space-y-2"><h3 className="mb-3 font-semibold text-slate-800">Uploaded versions ({resumes.length})</h3>{resumes.length===0?<p className="text-sm text-[#64748B]">No resume uploaded yet.</p>:resumes.map(r=>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE5EA] p-3 text-sm" key={r.id}><span className="break-all">{r.display_name}</span><span className={r.is_active?'text-[#0F766E]':'text-[#8CA79A]'}>{r.is_active?'Current':'Older'}</span></div>)}</div>
          </Panel>}
          {view==='inbox'&&<Panel title="Contact inbox" subtitle="Search and organize saved database messages. Email delivery integration is currently paused.">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <label className="relative min-w-[220px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><span className="sr-only">Search messages</span><input className={ui.input+' !pl-10'} value={inboxSearch} onChange={e=>setInboxSearch(e.target.value)} placeholder="Search sender, email or message..."/></label>
              <select className={ui.input+' !w-auto'} aria-label="Filter messages by status" value={inboxStatus} onChange={e=>setInboxStatus(e.target.value as typeof inboxStatus)}><option value="all">All messages</option><option value="unread">Unread</option><option value="read">Read</option><option value="archived">Archived</option></select>
            </div>
            {filteredMessages.length===0?<p className="admin-inset p-5 text-sm text-slate-500">{messages.length===0?'No saved contact messages yet. Contact delivery is still paused.':'No messages match the current filters.'}</p>:<div className="space-y-3">{filteredMessages.map(m=>
              <article key={m.id} className="admin-item">
                <div className="mb-2 flex justify-end"><span className={'admin-chip '+(m.status==='unread'?'admin-chip-draft':m.status==='read'?'admin-chip-saved':'')}>{m.status}</span></div>
                <div className="flex flex-wrap items-center justify-between gap-2"><b>{m.sender_name}</b><span className="text-xs text-[#64748B]">{new Date(m.created_at).toLocaleString('en-IN')}</span></div>
                <p className="mt-1 text-xs text-[#0F766E]">{m.sender_email}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{m.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a className={ui.button+' !px-3 !py-1.5 !text-xs'} href={'mailto:'+m.sender_email+'?subject='+encodeURIComponent('Re: Portfolio enquiry')}><ExternalLink size={13}/> Reply via email</a>
                  {(['unread','read','archived'] as const).map(s=><button key={s} disabled={busy||m.status===s} className={ui.button+' !px-3 !py-1.5 !text-xs'} onClick={()=>changeMessage(m.id,s)}>{m.status===s?'✓ ':''}{s}</button>)}</div>
              </article>)}</div>}
          </Panel>}
          {view==='downloads'&&<Panel title="CV download history" subtitle="Browse CV access requests once the gated download flow is enabled.">
            <div className="admin-note mb-5 rounded-xl p-4 text-sm"><strong className="text-teal-800">Tracking not active yet</strong><p className="mt-1 text-xs">The secure form and email notifications remain paused. No downloads are currently being tracked.</p></div>
            <label className="relative mb-5 block"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><span className="sr-only">Search CV history</span><input className={ui.input+' !pl-10'} value={downloadsSearch} onChange={e=>setDownloadsSearch(e.target.value)} placeholder="Search visitor or company name..."/></label>
            {filteredDownloads.length===0?<p className="admin-inset p-5 text-sm text-slate-500">{downloads.length===0?'No CV download records yet.':'No records match your search.'}</p>:<div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[540px] text-left text-sm"><thead className="text-xs uppercase text-[#64748B]"><tr><th className="p-3">Visitor</th><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Date</th></tr></thead><tbody>{filteredDownloads.map(d=><tr className="border-t border-[#DCE5EA]" key={d.id}><td className="p-3">{d.visitor_name}</td><td className="p-3">{d.company_name}</td><td className="p-3">{d.contact_email||d.contact_phone||'—'}</td><td className="p-3">{new Date(d.downloaded_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>}
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
