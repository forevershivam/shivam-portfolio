'use client';
import { createContext, useContext, type ReactNode, type CSSProperties } from 'react';
import { portfolioDefaults, type PortfolioData } from '@/lib/portfolio-defaults';

const ContentContext = createContext<PortfolioData>(portfolioDefaults);
export function PortfolioContentProvider({ value, children }: { value: PortfolioData; children: ReactNode }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value.theme.accent) ? value.theme.accent : '#34D399';
  return (
    <ContentContext.Provider value={value}>
      <div className="portfolio-live" style={{ '--color-accent': hex, '--color-accent-light': hex } as CSSProperties}>
        {children}
      </div>
    </ContentContext.Provider>
  );
}
export const usePortfolio = () => useContext(ContentContext);
