'use client';

import { useState, useCallback } from 'react';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';
import GlobalPreloader from '@/components/shared/GlobalPreloader';
import CustomCursor from '@/components/shared/CustomCursor';
import Providers from './providers';

declare global {
  interface Window {
    __preloaderDone?: boolean;
  }
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showCursor, setShowCursor] = useState(false);

  const handleExitComplete = useCallback(() => {
    setIsLoading(false);
    document.body.classList.remove('preloader-active');
    window.__preloaderDone = true;
    setShowCursor(true);
    window.dispatchEvent(new CustomEvent('preloaderComplete'));
  }, []);

  return (
    <>
      <div className="film-grain pointer-events-none" aria-hidden="true" />
      {showCursor && <CustomCursor />}

      {isLoading && (
        <GlobalPreloader mode="full" onComplete={handleExitComplete} />
      )}

      <SmoothScrollProvider>
        <Providers>{children}</Providers>
      </SmoothScrollProvider>
    </>
  );
}
