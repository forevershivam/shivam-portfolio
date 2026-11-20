import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getAdminSession, sameOrigin } from '@/lib/admin-auth';
import { getSupabaseConfig, supabaseRequest } from '@/lib/portfolio-supabase';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 8 * 1024 * 1024;
const error = (message: string,status: number) => NextResponse.json({error:message},{status});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return error('Invalid request origin',403);
  const session=await getAdminSession();
  if (!session) return error('Unauthorized',401);
  const config=getSupabaseConfig();
  if (!config) return error('Storage not configured',503);
  const form=await request.formData().catch(()=>null);
  const file=form?.get('file'), kind=form?.get('kind');
  if (!(file instanceof File) || !['photo','project','resume'].includes(String(kind))) return error('Choose an image or PDF',400);
  if (file.size<50 || file.size>MAX_BYTES) return error('File must be under 8 MB',413);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=String(kind)==='resume';
  const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  const validPdf=String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
  if (pdf?!validPdf:!(png||jpg||webp)) return error('Unsupported file format',415);
  const mime=pdf?'application/pdf':png?'image/png':jpg?'image/jpeg':'image/webp';
  const ext=pdf?'pdf':png?'png':jpg?'jpg':'webp';
  const bucket=pdf?'portfolio-resumes':'portfolio-media';
  const path=`${randomUUID()}.${ext}`;
  const upload=await supabaseRequest(`/storage/v1/object/${bucket}/${path}`,{
    method:'POST', headers:{'Content-Type':mime,'x-upsert':'false'}, body:bytes,
  },session.token);
  if (!upload.ok) return error('Storage rejected upload',502);
  if (pdf) {
    const old=await supabaseRequest('/rest/v1/portfolio_resume_documents?is_active=eq.true',{
      method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_active:false}),
    },session.token);
    if (!old.ok) return error('Failed to deactivate previous resume',502);
    const res=await supabaseRequest('/rest/v1/portfolio_resume_documents',{
      method:'POST', headers:{'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({display_name:file.name.slice(0,180),storage_path:path,is_active:true}),
    },session.token);
    if (!res.ok) return error('Resume uploaded but metadata update failed',502);
    return NextResponse.json({uploaded:true,private:true,name:file.name});
  }
  const media=await supabaseRequest('/rest/v1/portfolio_media',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({media_key:`image-${randomUUID()}`,storage_path:path,alt_text:file.name.slice(0,120)}),
  },session.token);
  if (!media.ok) return error('Image uploaded but media record failed',502);
  const url=`${config.url}/storage/v1/object/public/${bucket}/${path}`;
  return NextResponse.json({uploaded:true,url});
}
