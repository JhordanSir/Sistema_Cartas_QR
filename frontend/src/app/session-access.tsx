'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCopy } from '@/i18n/locale-provider';
import { shellCopy } from '@/i18n/messages/shell';

type SessionRole = 'ADMIN' | 'OWNER';

interface SessionGateProps {
  children: ReactNode;
  redirectTo: string;
  role: SessionRole;
}

interface SessionRedirectProps {
  destination: string;
  role: SessionRole;
}

export function SessionGate({ children, redirectTo, role }: SessionGateProps) {
  const router = useRouter();
  const copy = useCopy(shellCopy);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    void validateSession(role).then((isAuthorized) => {
      if (!active) return;
      if (isAuthorized) {
        setAuthorized(true);
        return;
      }
      router.replace(redirectTo);
    });
    return () => {
      active = false;
    };
  }, [redirectTo, role, router]);

  if (authorized) return children;
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6 text-[13px] text-ink-muted">
      <p role="status">{copy.checkingSession}</p>
    </main>
  );
}

export function SessionRedirect({ destination, role }: SessionRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void validateSession(role).then((isAuthorized) => {
      if (active && isAuthorized) router.replace(destination);
    });
    return () => {
      active = false;
    };
  }, [destination, role, router]);

  return null;
}

async function validateSession(role: SessionRole): Promise<boolean> {
  try {
    const response = await fetch(`/api/session/status?role=${role}`, {
      cache: 'no-store',
      method: 'POST',
    });
    return response.ok;
  } catch {
    return false;
  }
}
