'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';

export type IntroMode = 'full' | 'short';

export const preloaderWords = [
  'नमस्ते',
  'Hello',
  'નમસ્તે',
  'নমস্কার',
  'Welcome',
] as const;

export default function GlobalPreloader({
  mode = 'full',
  onComplete,
}: {
  mode?: IntroMode;
  onComplete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const exitingRef = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const exitRef = useRef<(skipped?: boolean) => void>(() => undefined);

  exitRef.current = (skipped = false) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setProgress(100);
    const container = containerRef.current;
    const path = pathRef.current;
    if (!container) {
      completeRef.current?.();
      return;
    }

    const w = dimensions.width;
    const h = dimensions.height;
    const targetPath =
      'M0 0 L' + w + ' 0 L' + w + ' ' + h + ' Q' + w / 2 + ' ' + h + ' 0 ' + h + ' L0 0';
    const duration = skipped ? 0.32 : mode === 'short' ? 0.40 : 0.65;
    const tl = gsap.timeline({
      onComplete: () => completeRef.current?.(),
    });
    if (path) {
      tl.to(path, {
        attr: { d: targetPath },
        duration: duration * 0.86,
        ease: 'power3.inOut',
      }, 0);
    }
    tl.to(container, { yPercent: -100, duration, ease: 'power4.inOut' }, 0);
  };

  useEffect(() => {
    const updateSize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const t = window.setTimeout(() => exitRef.current(true), 120);
      return () => window.clearTimeout(t);
    }

    const duration = mode === 'full' ? 3150 : 650;
    const startedAt = performance.now();
    let raf = 0;
    let finished = false;
    const frame = (now: number) => {
      const elapsed = now - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / duration) * 100)));
      setWordIndex(mode === 'short' ? preloaderWords.length - 1 : Math.min(preloaderWords.length - 1, Math.floor((elapsed / duration) * preloaderWords.length)));
      if (elapsed >= duration) {
        if (!finished) {
          finished = true;
          exitRef.current();
        }
        return;
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [mode]);

  const initialPath =
    'M0 0 L' + dimensions.width + ' 0 L' + dimensions.width + ' ' + dimensions.height +
    ' Q' + dimensions.width / 2 + ' ' + (dimensions.height + 300) +
    ' 0 ' + dimensions.height + ' L0 0';

  return (
    <div
      ref={containerRef}
      role="status"
      aria-label="Loading portfolio"
      className="fixed inset-0 z-[99999] flex select-none items-center justify-center bg-[#0B110E] text-[#E2E8E4]"
      style={{ willChange: 'transform' }}
    >
      <div
        className="relative z-10 flex max-w-[85vw] items-center text-center text-3xl sm:text-4xl md:text-5xl font-display font-medium text-cream transition-opacity duration-700 opacity-90"
      >
        <p key={wordIndex} className="tracking-wide">{preloaderWords[wordIndex]}</p>
      </div>

      <div className="absolute bottom-8 left-6 z-10 flex items-baseline gap-3 font-mono sm:left-8" aria-hidden="true">
        <span className="text-xs uppercase tracking-widest text-accent sm:text-sm">Loading</span>
        <span className="text-base tabular-nums sm:text-lg">{progress}%</span>
      </div>

      <button
        type="button"
        onClick={() => exitRef.current(true)}
        className="absolute bottom-7 right-6 z-20 rounded-full border border-accent/60 px-4 py-2 font-mono text-xs text-accent transition-colors hover:bg-accent hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:right-8"
        aria-label="Skip Animation"
      >
        Skip Animation
      </button>

      <div
        className="absolute bottom-0 left-0 z-10 h-[2px] w-full origin-left bg-accent"
        style={{ transform: 'scaleX(' + progress / 100 + ')' }}
        aria-hidden="true"
      />

      <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-[calc(100%+300px)] w-full">
        <path ref={pathRef} d={initialPath} fill="#0B110E" />
      </svg>
    </div>
  );
}
