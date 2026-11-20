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

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const { seo } = await getPublicPortfolio();
  return { ...siteMetadata, title: seo.title, description: seo.description };
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
        <CurvedSectionDivider curveColor="#0A0F0D" bottomColor="#E2E8E4" />
        <section className="relative z-20 bg-cream">
          <Projects />
        </section>
        <CurvedSectionDivider curveColor="#E2E8E4" bottomColor="#0A0F0D" />
        <div className="relative z-25 bg-ink overflow-hidden">
          <Contact />
          <Footer />
        </div>
      </HomeScrollOrchestrator>
    </PortfolioContentProvider>
  );
}
