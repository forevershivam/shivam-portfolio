import HomeBanner from '@/components/sections/HomeBanner';
import Projects from '@/components/sections/Projects';
import About from '@/components/sections/About';
import CurvedSectionDivider from '@/components/ui/CurvedSectionDivider';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/shared/Footer';
import Navbar from '@/components/shared/Navbar';
import HomeScrollOrchestrator from '@/components/home/HomeScrollOrchestrator';
import { PortfolioContentProvider } from '@/components/providers/PortfolioContentProvider';
import { getPublicPortfolio } from '@/lib/portfolio-supabase';
import { siteMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';
export async function generateMetadata():Promise<Metadata> {
  const { seo } = await getPublicPortfolio();
  let canonical=site.url;
  try {
    const candidate=new URL(seo.siteUrl);
    if(candidate.protocol==='https:'&&candidate.hostname)canonical=candidate.toString().replace(/\/$/,'');
  }catch { /* Default to verified production domain. */ }
  const image = seo.socialImage || canonical+'/api/og';
  return {
    ...siteMetadata,
    metadataBase:new URL(canonical),
    title:seo.title,description:seo.description,
    alternates:{canonical},
    openGraph:{
      title:seo.title,description:seo.description,url:canonical,siteName:'Shivam Sharma Portfolio',
      type:'website',images:[{url:image,width:1200,height:630,alt:seo.title}],
    },
    twitter:{card:'summary_large_image',title:seo.title,description:seo.description,images:[image]},
  };
}

export default async function Home() {
  const content = await getPublicPortfolio();
  return (
    <PortfolioContentProvider value={content}>
      <Navbar />
      <HomeScrollOrchestrator
        banner={<HomeBanner />}
        about={<About />}
      >
        <CurvedSectionDivider curveColor={content.theme.colors.background} bottomColor={content.theme.colors.lightBackground} />
        <section className="relative z-20 bg-cream">
          <Projects />
        </section>
        <CurvedSectionDivider curveColor={content.theme.colors.lightBackground} bottomColor={content.theme.colors.background} />
        <div className="relative z-25 bg-ink overflow-hidden">
          <Contact />
          <Footer />
        </div>
      </HomeScrollOrchestrator>
    </PortfolioContentProvider>
  );
}
