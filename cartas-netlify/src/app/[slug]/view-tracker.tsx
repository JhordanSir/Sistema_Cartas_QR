'use client';

import { useEffect } from 'react';

/**
 * Counts the visit from the diner's browser once the page loads (§E8, §E11).
 * The page itself stays cached; errors never reach the diner.
 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/vistas/${encodeURIComponent(slug)}`, { keepalive: true, method: 'POST' }).catch(() => undefined);
  }, [slug]);
  return null;
}
