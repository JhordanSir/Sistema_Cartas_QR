'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Scrolls sideways when the bars do not fit (on a phone), focusable so the
 * keyboard can scroll it too. On load it centers the busiest bar, so the first
 * view is not a row of empty early-morning hours.
 */
export function ScrollRegion({ children, label }: { children: ReactNode; label: string }) {
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = region.current;
    const peak = element?.querySelector<HTMLElement>('[data-peak]');
    if (!element || !peak || element.scrollWidth <= element.clientWidth) return;
    element.scrollLeft = peak.offsetLeft - (element.clientWidth - peak.offsetWidth) / 2;
  }, []);

  return (
    <div
      aria-label={label}
      className="relative -mx-1 min-w-0 overflow-x-auto px-1"
      ref={region}
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
