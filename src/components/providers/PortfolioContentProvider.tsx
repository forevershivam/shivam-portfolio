'use client';
import { createContext, useContext, type ReactNode, type CSSProperties } from 'react';
import { portfolioDefaults, type PortfolioData } from '@/lib/portfolio-defaults';
import { themeVariables } from '@/lib/portfolio-theme';

const ContentContext = createContext<PortfolioData>(portfolioDefaults);
export function PortfolioContentProvider({ value, children }: { value: PortfolioData; children: ReactNode }) {
  const variables=themeVariables(value.theme);
  return (
    <ContentContext.Provider value={value}>
      <div className="portfolio-live" style={variables as CSSProperties}>
        {children}
      </div>
    </ContentContext.Provider>
  );
}
export const usePortfolio = () => useContext(ContentContext);
