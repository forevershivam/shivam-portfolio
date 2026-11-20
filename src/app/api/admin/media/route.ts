import { NextResponse } from 'next/server';
import { getAdminSession, sameOrigin } from '@/lib/admin-auth';
import { getSupabaseConfig, supabaseRequest } from '@/lib/portfolio-supabase';
export const dynamic='force-dynamic';

async function mediaList(token:string){
 const res=await supabaseRequest('/rest/v1/portfolio_media?select=id,storage_path,alt_text,created_at,published&order=created_at.desc&limit=200',{},token);
 if(!res.ok)throw Error('Cannot read media library');
 const config=getSupabaseConfig()!;
 const rows=await res.json() as {id:string;storage_path:string;alt_text:string;created_at:string;published:boolean}[];
 return rows.map(row=>({...row,url:`${config.url}/storage/v1/object/public/portfolio-media/${row.storage_path}`}));
}
export async function GET(){
 const s=await getAdminSession();if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{return NextResponse.json({media:await mediaList(s.token)},{headers:{'Cache-Control':'private, no-store'}});}
 catch{return NextResponse.json({error:'Could not load media'},{status:502});}
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const s=await getAdminSession();if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});
 const input=await request.json().catch(()=>null);
 if(!input||!/^[\da-f-]{36}$/i.test(input.id)||typeof input.alt_text!=='string'||input.alt_text.length>200)return NextResponse.json({error:'Invalid media update'},{status:400});
 const result=await supabaseRequest(`/rest/v1/portfolio_media?id=eq.${input.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({alt_text:input.alt_text})},s.token);
 if(!result.ok)return NextResponse.json({error:'Could not update image label'},{status:502});
 return NextResponse.json({updated:true});
}
export async function DELETE(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const s=await getAdminSession();if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});
 const id=new URL(request.url).searchParams.get('id');
 if(!id||!/^\w?[\da-f-]{36}$/i.test(id))return NextResponse.json({error:'Invalid media id'},{status:400});
 const list=await mediaList(s.token).catch(()=>null);const file=list?.find(item=>item.id===id);
 if(!file)return NextResponse.json({error:'Image not found'},{status:404});
 const [published,drafts]=await Promise.all([
  supabaseRequest('/rest/v1/portfolio_sections?select=content',{},s.token),
  supabaseRequest('/rest/v1/portfolio_drafts?select=content',{},s.token),
 ]);
 if(!published.ok||!drafts.ok)return NextResponse.json({error:'Cannot verify references; image not deleted'},{status:502});
 const live=await published.json(),pending=await drafts.json();
 const referenced=[...live,...pending].some((row:{content:unknown})=>JSON.stringify(row.content).includes(file.url));
 if(referenced)return NextResponse.json({error:'Image is used in a published section or saved draft. Remove it from content first.'},{status:409});
 if(!/^[\da-f]{8}-[\da-f-]{27,}\.(png|jpg|webp)$/i.test(file.storage_path))return NextResponse.json({error:'Unsafe file path'},{status:400});
 const removed=await supabaseRequest(`/storage/v1/object/portfolio-media/${file.storage_path}`,{method:'DELETE'},s.token);
 if(!removed.ok)return NextResponse.json({error:'Could not delete stored image'},{status:502});
 const meta=await supabaseRequest(`/rest/v1/portfolio_media?id=eq.${id}`,{method:'DELETE'},s.token);
 if(!meta.ok)return NextResponse.json({error:'File removed but image listing could not be updated'},{status:502});
 return NextResponse.json({deleted:true});
}
