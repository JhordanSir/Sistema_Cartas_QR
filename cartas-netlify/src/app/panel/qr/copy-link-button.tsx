'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function CopyLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState<'copied' | 'failed' | null>(null);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className="grid gap-1">
      <Button onClick={copy} variant="secondary">
        Copiar enlace
      </Button>
      <p className="m-0 min-h-5 text-[13px] text-ink-soft" role="status">
        {status === 'copied' ? 'Enlace copiado.' : null}
        {status === 'failed' ? 'No pudimos copiar el enlace. Cópialo a mano.' : null}
      </p>
    </div>
  );
}
