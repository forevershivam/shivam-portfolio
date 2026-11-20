import type { MetadataRoute } from 'next';
import { getPublicPortfolio } from '@/lib/portfolio-supabase';
import { site } from '@/lib/site';

export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const { projects, seo } = await getPublicPortfolio();
  let base=site.url;
  try {const url=new URL(seo.siteUrl);if(url.protocol==='https:'&&url.hostname)base=url.toString().replace(/\/$/,'');}catch {}
  return [
    {url:base,lastModified:new Date(),changeFrequency:'weekly',priority:1},
    ...projects.items.map(p=>({url:`${base}/projects/${p.slug}`,lastModified:new Date(),changeFrequency:'monthly' as const,priority:0.8})),
  ];
}
