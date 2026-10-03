'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-reveal wrapper: fades content up once when it enters the viewport.
 *
 * - Server HTML renders fully visible (SEO + no-JS safe).
 * - After hydration, elements still below the fold are hidden and revealed
 *   on scroll with a 30-50ms stagger via the `delay` prop.
 * - Respects prefers-reduced-motion and skips animation for elements
 *   already visible on load.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 'shown' on the server and before hydration — never render blank HTML.
  const [state, setState] = useState<'shown' | 'hidden'>('shown');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const supported =
      typeof IntersectionObserver !== 'undefined' &&
      typeof el.animate === 'function';

    if (reduced || !supported) return;

    // Already in view on load (above the fold): leave it visible, no animation.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    setState('hidden');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('shown');
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        state === 'hidden' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      } ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
