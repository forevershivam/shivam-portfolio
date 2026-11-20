import { NextResponse } from 'next/server';
import { getAdminSession, sameOrigin } from '@/lib/admin-auth';
import { supabaseRequest } from '@/lib/portfolio-supabase';
import { normalizeTheme, type ThemePreset } from '@/lib/portfolio-theme';
export const dynamic='force-dynamic';
const route='/rest/v1/portfolio_settings?setting_key=eq.theme_presets&select=value';
export async function GET(){
 const s=await getAdminSession();if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});
 const r=await supabaseRequest(route,{},s.token);
 if(!r.ok)return NextResponse.json({error:'Could not read saved presets'},{status:502});
 const [row]=await r.json();const items=Array.isArray(row?.value?.items)?row.value.items:[];
 return NextResponse.json({presets:items},{headers:{'Cache-Control':'private, no-store'}});
}
export async function PUT(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const s=await getAdminSession();if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});
 const body=await request.json().catch(()=>null);
 if(!body||!Array.isArray(body.presets)||body.presets.length>30)return NextResponse.json({error:'Too many presets'},{status:422});
 const ids=new Set<string>();
 const result:ThemePreset[]=[];
 for(const entry of body.presets){
  if(!entry||typeof entry.id!=='string'||!/^custom-[a-z0-9-]{6,80}$/.test(entry.id)||ids.has(entry.id)||typeof entry.name!=='string'||entry.name.trim().length<1||entry.name.length>65||!entry.theme||typeof entry.theme!=='object'||Array.isArray(entry.theme))return NextResponse.json({error:'Invalid preset'},{status:422});
  ids.add(entry.id);result.push({id:entry.id,name:entry.name.trim(),theme:normalizeTheme(entry.theme)});
 }
 const r=await supabaseRequest('/rest/v1/portfolio_settings?on_conflict=setting_key',{
  method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
  body:JSON.stringify({setting_key:'theme_presets',value:{items:result},public_readable:false,updated_at:new Date().toISOString()}),
 },s.token);
 if(!r.ok)return NextResponse.json({error:'Could not save presets'},{status:502});
 return NextResponse.json({saved:true,presets:result});
}
