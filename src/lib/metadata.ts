import type {Metadata} from 'next';
import {site} from './site';
const shouldIndex=process.env.VERCEL_ENV ? process.env.VERCEL_ENV==='production' : process.env.NODE_ENV==='production' && Boolean(process.env.NEXT_PUBLIC_SITE_URL);
export const siteMetadata:Metadata={
 title:{default:'Shivam Sharma | Data Analyst',template:'%s | Shivam Sharma'},
 description:'Data Analytics portfolio showcasing Excel dashboards, SQL analysis and MIS reporting.',
 keywords:['Shivam Sharma','Data Analyst','Excel','SQL','Power BI','MIS Reporting'],
 authors:[{name:site.name}],creator:site.name,metadataBase:new URL(site.url),
 alternates:{canonical:'./'},icons:{icon:'/icon.svg'},
 openGraph:{title:'Shivam Sharma | Data Analyst',description:site.tagline,url:site.url,siteName:'Shivam Sharma Portfolio',type:'website'},
 robots:{index:shouldIndex,follow:shouldIndex}
};
