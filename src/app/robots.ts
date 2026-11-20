import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const isProduction=process.env.VERCEL_ENV ? process.env.VERCEL_ENV==='production' : process.env.NODE_ENV==='production' && Boolean(process.env.NEXT_PUBLIC_SITE_URL);
  return {
    rules: isProduction ? {userAgent:'*',allow:'/',disallow:['/admin','/api/admin/']} : {userAgent:'*',disallow:'/'},
    sitemap: isProduction ? `${site.url}/sitemap.xml` : undefined,
  };
}
