'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { gsap, SplitText, ScrollTrigger, useGSAP } from '@/lib/gsap';
import AnimatedButton from '@/components/ui/AnimatedButton';
import MarqueeStrip from '@/components/sections/MarqueeStrip';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { site } from '@/lib/site';

const FlowField = dynamic(() => import('@/components/canvas/FlowField'), { ssr: false });

const jobRoles = [
  'Back Office Executive',
  'MIS Executive',
  'Associate Analyst',
  'Data Entry',
] as const;

export default function HomeBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const rolesRef = useRef<HTMLUListElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading || reduced) return;

    const splits: SplitText[] = [];
    const characters: HTMLElement[] = [];
    heading.querySelectorAll<HTMLElement>('[data-hero-line]').forEach((element) => {
      const split = SplitText.create(element, {
        type: 'chars',
        charsClass: 'hero-char',
      });
      splits.push(split);
      characters.push(...(split.chars as HTMLElement[]));
    });

    const otherElements = [
      statusRef.current,
      descriptionRef.current,
      rolesRef.current,
      buttonsRef.current,
    ].filter(Boolean);

    gsap.set(characters, {
      opacity: 0,
      yPercent: 105,
      rotateX: -55,
      transformPerspective: 800,
      transformOrigin: '50% 100%',
    });
    gsap.set(otherElements, { opacity: 0, y: 28 });

    let intro: gsap.core.Timeline | undefined;
    let played = false;
    const playIntro = () => {
      if (played) return;
      played = true;
      intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .to(characters, {
          opacity: 1,
          yPercent: 0,
          rotateX: 0,
          duration: 0.82,
          stagger: 0.026,
        })
        .to(otherElements, {
          opacity: 1,
          y: 0,
          duration: 0.72,
          stagger: 0.1,
        }, '-=0.36');
    };

    window.addEventListener('preloaderComplete', playIntro);
    if (window.__preloaderDone) playIntro();
    // Fallback if the preloader was skipped or its event was missed.
    const fallback = window.setTimeout(playIntro, 4200);

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener('preloaderComplete', playIntro);
      intro?.kill();
      gsap.set(otherElements, { clearProps: 'all' });
      splits.forEach((split) => split.revert());
    };
  }, [reduced]);

  useGSAP(
    () => {
      if (reduced || !sectionRef.current || !innerRef.current) return;
      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        animation: gsap.to(innerRef.current, {
          y: '-10vh',
          ease: 'none',
        }),
      });
      return () => trigger.kill();
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const smooth = (window as typeof window & { __lenis?: { scrollTo: (target: HTMLElement, opts?: object) => void } }).__lenis;
    if (smooth && !reduced) {
      smooth.scrollTo(element, { duration: 1.1 });
    } else {
      element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="top"
      className="shivam-hero relative flex min-h-[100dvh] items-center overflow-hidden bg-[#E2E8E4] px-6 pb-24 pt-32 text-[#0A0F0D] sm:px-8 md:px-12 md:pb-28 lg:px-16"
    >
      <FlowField light />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#E2E8E4]/75 via-transparent to-[#E2E8E4]/20"
        aria-hidden="true"
      />

      <div ref={innerRef} className="relative z-10 mx-auto w-full max-w-6xl">
        <div
          ref={statusRef}
          className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#ADCBB9] bg-white/65 px-4 py-2 font-mono text-xs text-[#147953] sm:text-sm"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#34D399]" aria-hidden="true" />
          Open to entry-level roles
        </div>

        <h1
          ref={headingRef}
          aria-label={site.name}
          className="mb-7 flex flex-wrap items-baseline gap-x-3 gap-y-0 leading-[0.95] sm:gap-x-6 md:mb-8"
        >
          <span
            aria-hidden="true"
            data-hero-line
            className="inline-block font-display text-[clamp(3.5rem,8.25vw,8.2rem)] font-black uppercase tracking-[-0.075em]"
          >
            SHIVAM
          </span>
          <em
            aria-hidden="true"
            data-hero-line
            className="inline-block font-serif text-[clamp(4.2rem,8.55vw,8.6rem)] font-normal italic normal-case tracking-[-0.06em] text-[#34D399]"
          >
            Sharma
          </em>
        </h1>

        <p
          ref={descriptionRef}
          className="mb-7 max-w-[680px] font-sans text-base leading-relaxed text-[#45524B] sm:text-lg md:text-xl"
        >
          Fresher Data Analyst who cleans messy records, writes SQL and creates clear Excel dashboards
          and MIS reports. Currently learning Power BI.
          <span className="mt-2 block">
            <strong className="font-semibold text-[#0A0F0D]">47 WPM typing speed · 98% accuracy</strong>
            <span className="text-[#596C61]"> (1-minute test)</span>
          </span>
        </p>

        <ul
          ref={rolesRef}
          aria-label="Entry-level roles I am interested in"
          className="mb-8 flex flex-wrap gap-2 sm:gap-2.5"
        >
          {jobRoles.map((role) => (
            <li
              key={role}
              className="rounded-full border border-[#BAC8C0] bg-white/75 px-4 py-2 text-xs font-semibold text-[#24372C] transition-colors duration-300 hover:border-[#078456]/70 hover:text-[#078456] sm:text-sm"
            >
              {role}
            </li>
          ))}
        </ul>

        <div ref={buttonsRef} className="flex flex-wrap items-center gap-x-3 gap-y-4">
          <AnimatedButton
            onClick={() => scrollTo('projects')}
            topText="See my projects"
            bottomText="View projects →"
            variant="primary"
            className="!text-[#061911]"
          />
          <AnimatedButton
            onClick={() => scrollTo('contact')}
            topText="Contact me"
            bottomText="Say hello →"
            variant="outline"
            className="!border-[#0E9262] !text-[#0B6848]"
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <MarqueeStrip />
      </div>
    </section>
  );
}
