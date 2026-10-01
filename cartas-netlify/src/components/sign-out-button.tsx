'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { sendJson } from '@/components/forms/send-json';
import { cn } from '@/components/ui/cn';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut(): Promise<void> {
    setPending(true);
    setError(null);
    const result = await sendJson('/api/sesion', 'DELETE');
    if (!result.ok) {
      setPending(false);
      setError(result.error.message);
      return;
    }
    router.replace('/entrar');
    router.refresh();
  }

  return (
    <>
      <button className={className} disabled={pending} onClick={signOut} type="button">
        Salir
      </button>
      {error ? (
        <p className={cn('m-0 px-3 text-[13px] font-medium text-danger')} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
