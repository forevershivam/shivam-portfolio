'use client';

import { useEffect, useState, useCallback } from 'react';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';
import GlobalPreloader, { type IntroMode } from '@/components/shared/GlobalPreloader';
import CustomCursor from '@/components/shared/CustomCursor';
import Providers from './providers';

declare global {
  interface Window {
    __preloaderDone?: boolean;
  }
}

const LAST_FULL_INTRO_KEY = 'shivam-portfolio-last-full-intro';
const FULL_INTRO_INTERVAL = 5 * 60 * 1000;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showCursor, setShowCursor] = useState(false);
  const [mode, setMode] = useState<IntroMode>('full');

  useEffect(() => {
    // Browser refresh within five minutes gets a short intro.
    // A first visit or a return after five minutes gets the full sequence.
    try {
      const saved = Number(localStorage.getItem(LAST_FULL_INTRO_KEY));
      if (Number.isFinite(saved) && saved > 0 &&
        Date.now() >= saved && Date.now() - saved < FULL_INTRO_INTERVAL) {
        setMode('short');
      }
    } catch {
      // Storage can be disabled; use the full intro.
    }
  }, []);

  const handleExitComplete = useCallback(() => {
    if (mode === 'full') {
      try {
        localStorage.setItem(LAST_FULL_INTRO_KEY, String(Date.now()));
      } catch {
        // Local storage is optional.
      }
    }

    setIsLoading(false);
    document.body.classList.remove('preloader-active');
    window.__preloaderDone = true;
    setShowCursor(true);
    window.dispatchEvent(new CustomEvent('preloaderComplete'));
  }, [mode]);

  return (
    <>
      <div className="film-grain pointer-events-none" aria-hidden="true" />
      {showCursor && <CustomCursor />}

      {isLoading && (
        <GlobalPreloader key={mode} mode={mode} onComplete={handleExitComplete} />
      )}

      <SmoothScrollProvider>
        <Providers>{children}</Providers>
      </SmoothScrollProvider>
    </>
  );
}
