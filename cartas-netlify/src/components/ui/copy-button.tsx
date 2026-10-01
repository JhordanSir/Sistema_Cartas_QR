'use client';

import { useState } from 'react';

import { Button } from './button';

/** Copies a text to the clipboard and says whether it worked. */
export function CopyButton({
  copiedMessage,
  failedMessage,
  label,
  text,
}: {
  copiedMessage: string;
  failedMessage: string;
  label: string;
  text: string;
}) {
  const [status, setStatus] = useState<'copied' | 'failed' | null>(null);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className="grid gap-1">
      <Button onClick={copy} variant="secondary">
        {label}
      </Button>
      <p className="m-0 min-h-5 text-[13px] text-ink-soft" role="status">
        {status === 'copied' ? copiedMessage : null}
        {status === 'failed' ? failedMessage : null}
      </p>
    </div>
  );
}
