import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '88px',
        background: '#0A0F0D',
        color: '#E2E8E4',
        fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{ display: 'flex', fontSize: 23, letterSpacing: 7, color: '#34D399', marginBottom: 36 }}>
          DATA ANALYTICS PORTFOLIO
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 106, fontWeight: 800, letterSpacing: -5 }}>
          SHIVAM <span style={{ color: '#34D399', marginLeft: 24 }}>Sharma.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 34, fontSize: 32, color: '#B7CAC0' }}>
          Excel · SQL · MIS Reporting · Power BI (learning)
        </div>
        <div style={{ display: 'flex', marginTop: 48, width: 140, height: 6, borderRadius: 3, background: '#34D399' }} />
      </div>
    ),
    size,
  );
}
