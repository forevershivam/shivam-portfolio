import { ImageResponse } from 'next/og';
import { getPublicPortfolio } from '@/lib/portfolio-supabase';

const size = { width: 1200, height: 630 };

export const dynamic='force-dynamic';
export async function GET() {
  const {hero,theme}=await getPublicPortfolio();
  const accent=theme.colors.accent;
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '88px',
        background: theme.colors.background,
        color: theme.colors.heading,
        fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{ display: 'flex', fontSize: 23, letterSpacing: 7, color: accent, marginBottom: 36 }}>
          DATA ANALYTICS PORTFOLIO
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 106, fontWeight: 800, letterSpacing: -5 }}>
          {hero.firstName.toUpperCase()} <span style={{ color: accent, marginLeft: 24 }}>{hero.lastName}.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 34, fontSize: 32, color: '#B7CAC0' }}>
          Excel · SQL · MIS Reporting · Power BI (learning)
        </div>
        <div style={{ display: 'flex', marginTop: 48, width: 140, height: 6, borderRadius: 3, background: accent }} />
      </div>
    ),
    size,
  );
}
