'use client';

import { useEffect } from 'react';

export function PublicViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    void fetch(`/api/public/restaurants/${encodeURIComponent(slug)}/view`, {
      cache: 'no-store',
      keepalive: true,
      method: 'POST',
    }).catch(() => undefined);
  }, [slug]);

  return null;
}
