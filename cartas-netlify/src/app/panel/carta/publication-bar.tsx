'use client';

import { useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { ConfirmDialog } from '@/components/ui/dialogs';
import type { MenuPublication } from '@/shared/menu';

function statusText({ hasUnpublishedChanges, publishedAt }: MenuPublication): string {
  if (hasUnpublishedChanges) return 'Tienes cambios por publicar.';
  if (publishedAt) return 'Tu carta está publicada y al día.';
  return 'Tu carta aún no está publicada.';
}

/**
 * Where the draft stands against what diners see (§E7, §E13), and the only
 * way to change what they see: «Publicar carta», after confirming.
 */
export function PublicationBar({
  disabled,
  onPublish,
  publication,
}: {
  disabled: boolean;
  /** Resolves true when the menu was published. */
  onPublish: () => Promise<boolean>;
  publication: MenuPublication;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const canPublish = publication.hasUnpublishedChanges || !publication.publishedAt;

  async function publish(): Promise<void> {
    setPending(true);
    const published = await onPublish();
    setPending(false);
    setConfirming(false);
    setJustPublished(published);
  }

  return (
    <section
      aria-label="Publicación de la carta"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-card border px-5 py-4',
        publication.hasUnpublishedChanges ? 'border-warning/30 bg-warning-wash' : 'border-line bg-raised',
      )}
    >
      <div className="grid gap-0.5">
        <p className="m-0 font-semibold" role="status">
          {justPublished && !publication.hasUnpublishedChanges ? 'Carta publicada. ' : ''}
          {statusText(publication)}
        </p>
        {publication.publishedAt ? (
          <p className="m-0 text-[13px] text-ink-soft">
            Última publicación:{' '}
            {new Intl.DateTimeFormat('es-PE', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'America/Lima',
            }).format(new Date(publication.publishedAt))}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {canPublish ? (
          <Button disabled={disabled || pending} onClick={() => setConfirming(true)}>
            Publicar carta
          </Button>
        ) : null}
        <ButtonLink href={`/${publication.slug}`} rel="noopener" target="_blank" variant="secondary">
          Ver carta pública
        </ButtonLink>
      </div>
      <ConfirmDialog
        confirmLabel="Publicar carta"
        onCancel={() => setConfirming(false)}
        onConfirm={publish}
        open={confirming}
        pending={pending}
        title="¿Publicar tu carta?"
        tone="primary"
      >
        <p className="m-0">Tus clientes verán la carta tal como está ahora en cuanto publiques.</p>
      </ConfirmDialog>
    </section>
  );
}
