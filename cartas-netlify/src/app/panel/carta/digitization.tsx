'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { prepareImage } from '@/components/forms/prepare-image';
import { sendForm, sendJson } from '@/components/forms/send-json';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { Notice } from '@/components/ui/surfaces';
import {
  DIGITIZATION_LIMITS,
  DIGITIZATION_TEXTS,
  digitizationErrorMessage,
  formatFileSize,
  parseDigitizationJob,
  type DigitizationJobView,
} from '@/shared/digitization';
import { ACCEPTED_IMAGE_TYPES } from '@/shared/images';
import { parseMenuDraft, type MenuDraft } from '@/shared/menu';
import { GENERIC_ERROR_MESSAGE } from '@/shared/messages';

const POLL_INTERVAL_MS = 3000;
/** A job found UPLOADING after a reload gets this long to start before it counts as interrupted. */
const RESUME_GRACE_MS = 20_000;
/** After invoking the function: invoke it once more at 30 s, give up at 60 s. */
const REINVOKE_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 60_000;
const START_FAILED = 'No pudimos empezar a leer tu carta. Inténtalo de nuevo.';

export type DigitizationPhase =
  | { kind: 'idle' }
  | { kind: 'uploading'; uploaded: number; total: number }
  /** `resumed`: found running when the page opened, instead of started here. */
  | { kind: 'processing'; jobId: string; resumed: boolean }
  /** The page was closed while uploading: that job can only be discarded. */
  | { kind: 'interrupted'; jobId: string }
  | { kind: 'failed'; message: string }
  | { kind: 'done' };

function phaseFor(job: DigitizationJobView | null): DigitizationPhase {
  return job ? { jobId: job.id, kind: 'processing', resumed: true } : { kind: 'idle' };
}

function invokeBackgroundFunction(jobId: string): Promise<boolean> {
  // The browser, not the server, starts the work: while the site is private,
  // a request from the server to its own URL would not get through (§E10).
  return fetch('/.netlify/functions/digitize-background', {
    body: JSON.stringify({ jobId }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
    .then((response) => response.ok)
    .catch(() => false);
}

async function fetchDraft(): Promise<MenuDraft | null> {
  const result: unknown = await fetch('/api/carta')
    .then((response) => response.json())
    .catch(() => null);
  return parseMenuDraft(result);
}

/**
 * The digitization flow of §E10 on the browser side: create the job, upload
 * the photos one by one, invoke the Background Function and ask for the status
 * every 3 s until it ends. A job found running when the page opens is resumed.
 *
 * The function answers 202 at once but may start a few seconds later (a cold
 * start), so a job still UPLOADING right after being sent is not stuck yet.
 */
export function useDigitization({
  initialJob,
  onDraft,
}: {
  initialJob: DigitizationJobView | null;
  onDraft: (draft: MenuDraft) => void;
}) {
  const [phase, setPhase] = useState<DigitizationPhase>(() => phaseFor(initialJob));
  const onDraftRef = useRef(onDraft);
  useEffect(() => {
    onDraftRef.current = onDraft;
  }, [onDraft]);

  const processing = phase.kind === 'processing' ? phase : null;
  const processingJobId = processing?.jobId ?? null;
  const resumed = processing?.resumed ?? false;

  useEffect(() => {
    if (!processingJobId) return;
    const startedAt = Date.now();
    let reinvoked = false;
    let stopped = false;

    async function finish(job: DigitizationJobView): Promise<void> {
      if (job.status === 'FAILED') {
        setPhase({ kind: 'failed', message: digitizationErrorMessage(job.errorCode) });
        return;
      }
      const draft = await fetchDraft();
      if (draft) onDraftRef.current(draft);
      setPhase({ kind: 'done' });
    }

    async function giveUp(jobId: string): Promise<void> {
      await sendJson(`/api/digitalizacion/${jobId}`, 'DELETE');
      setPhase({ kind: 'failed', message: START_FAILED });
    }

    const timer = setInterval(async () => {
      if (!processingJobId) return;
      const job = await fetch(`/api/digitalizacion/${processingJobId}`)
        .then((response) => response.json())
        .then(parseDigitizationJob)
        .catch(() => null);
      // A network hiccup is not an answer: the next round asks again.
      if (stopped || !job || job.status === 'PROCESSING') return;

      if (job.status === 'UPLOADING') {
        const waited = Date.now() - startedAt;
        if (resumed && waited >= RESUME_GRACE_MS) {
          stopped = true;
          clearInterval(timer);
          setPhase({ jobId: job.id, kind: 'interrupted' });
        } else if (!resumed && waited >= GIVE_UP_AFTER_MS) {
          stopped = true;
          clearInterval(timer);
          await giveUp(job.id);
        } else if (!resumed && waited >= REINVOKE_AFTER_MS && !reinvoked) {
          reinvoked = true;
          await invokeBackgroundFunction(job.id);
        }
        return;
      }

      stopped = true;
      clearInterval(timer);
      await finish(job);
    }, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [processingJobId, resumed]);

  async function start(photos: readonly File[]): Promise<void> {
    setPhase({ kind: 'uploading', total: photos.length, uploaded: 0 });
    const created = await sendJson('/api/digitalizacion', 'POST');
    const job = created.ok ? parseDigitizationJob(created.data) : null;
    if (!job) {
      setPhase({ kind: 'failed', message: created.ok ? GENERIC_ERROR_MESSAGE : created.error.message });
      return;
    }

    for (const [index, photo] of photos.entries()) {
      const body = new FormData();
      body.set('photo', photo);
      const uploaded = await sendForm(`/api/digitalizacion/${job.id}/fotos/${index + 1}`, 'PUT', body);
      if (!uploaded.ok) {
        await sendJson(`/api/digitalizacion/${job.id}`, 'DELETE');
        setPhase({ kind: 'failed', message: uploaded.error.fields?.photo ?? uploaded.error.message });
        return;
      }
      setPhase({ kind: 'uploading', total: photos.length, uploaded: index + 1 });
    }

    if (!(await invokeBackgroundFunction(job.id))) {
      await sendJson(`/api/digitalizacion/${job.id}`, 'DELETE');
      setPhase({ kind: 'failed', message: START_FAILED });
      return;
    }
    setPhase({ jobId: job.id, kind: 'processing', resumed: false });
  }

  async function discard(jobId: string): Promise<void> {
    await sendJson(`/api/digitalizacion/${jobId}`, 'DELETE');
    const draft = await fetchDraft();
    if (draft) onDraftRef.current(draft);
    setPhase({ kind: 'idle' });
  }

  const running = phase.kind === 'uploading' || phase.kind === 'processing' || phase.kind === 'interrupted';
  return { discard, phase, reset: () => setPhase({ kind: 'idle' }), running, start };
}

/** Where the digitization stands, above the editor. */
export function DigitizationStatus({
  onDiscard,
  onRetry,
  phase,
}: {
  onDiscard: (jobId: string) => void;
  onRetry: () => void;
  phase: DigitizationPhase;
}) {
  if (phase.kind === 'idle') return null;
  if (phase.kind === 'done') return <Notice tone="success">{DIGITIZATION_TEXTS.succeeded}</Notice>;
  if (phase.kind === 'failed') {
    return (
      <div className="grid justify-items-start gap-3">
        <Notice tone="error">{phase.message}</Notice>
        <Button onClick={onRetry} variant="secondary">
          Volver a intentar
        </Button>
      </div>
    );
  }
  if (phase.kind === 'interrupted') {
    return (
      <div className="grid justify-items-start gap-3 rounded-card border border-warning/30 bg-warning-wash px-5 py-4">
        <p className="m-0 font-semibold text-warning" role="status">
          La subida de las fotos anteriores no terminó.
        </p>
        <Button onClick={() => onDiscard(phase.jobId)} variant="secondary">
          Descartar y volver a empezar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-raised px-5 py-4">
      <span
        aria-hidden="true"
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-wine border-t-transparent motion-reduce:animate-none"
      />
      <p className="m-0 font-semibold" role="status">
        {phase.kind === 'uploading'
          ? `${DIGITIZATION_TEXTS.uploading} (${phase.uploaded} de ${phase.total})`
          : DIGITIZATION_TEXTS.processing}
      </p>
    </div>
  );
}

type ChosenPhoto = { key: string; file: File; url: string };

let lastPhotoKey = 0;

/** Choosing the photos (1 to 5) inside the sheet, with thumbnails and sizes. */
export function DigitizePhotos({
  hasProducts,
  onCancel,
  onStart,
}: {
  hasProducts: boolean;
  onCancel: () => void;
  onStart: (photos: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<ChosenPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const created = urls.current;
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const totalBytes = photos.reduce((total, photo) => total + photo.file.size, 0);
  const tooHeavy = totalBytes > DIGITIZATION_LIMITS.maxTotalBytes;

  async function choose(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (files.length === 0) return;
    setError(null);
    const room = DIGITIZATION_LIMITS.maxPhotos - photos.length;
    if (files.length > room) setError('Puedes subir de 1 a 5 fotos.');
    setPreparing(true);
    const added: ChosenPhoto[] = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      const prepared = await prepareImage(file, {
        maxBytes: DIGITIZATION_LIMITS.maxPhotoBytes,
        maxSide: DIGITIZATION_LIMITS.maxSide,
        tooLargeMessage: 'Cada foto puede pesar como máximo 3 MB.',
      });
      if (!prepared.ok) {
        setError(prepared.error);
        continue;
      }
      lastPhotoKey += 1;
      const url = URL.createObjectURL(prepared.file);
      urls.current.add(url);
      added.push({ file: prepared.file, key: `foto-${lastPhotoKey}`, url });
    }
    setPhotos((current) => [...current, ...added]);
    setPreparing(false);
  }

  function remove(key: string): void {
    setError(null);
    setPhotos((current) => current.filter((photo) => photo.key !== key));
  }

  function submit(): void {
    if (photos.length === 0) {
      setError('Elige al menos una foto de tu carta.');
      return;
    }
    if (tooHeavy) return;
    if (hasProducts) setConfirming(true);
    else onStart(photos.map((photo) => photo.file));
  }

  return (
    <div className="grid gap-5">
      <p className="m-0 text-[15px] text-ink-soft">
        Toma o elige de 1 a 5 fotos de tu carta impresa. Solo se usan para leerla y se borran al terminar.
      </p>
      <input
        accept={ACCEPTED_IMAGE_TYPES}
        aria-label="Fotos de la carta"
        className="sr-only"
        multiple
        onChange={choose}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <Button
        className="justify-self-start"
        disabled={preparing || photos.length >= DIGITIZATION_LIMITS.maxPhotos}
        onClick={() => input.current?.click()}
        variant="secondary"
      >
        {preparing ? 'Preparando fotos…' : photos.length > 0 ? 'Agregar más fotos' : 'Elegir fotos'}
      </Button>

      {photos.length > 0 ? (
        <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3" aria-label="Fotos elegidas">
          {photos.map((photo, index) => (
            <li className="grid gap-2 rounded-control border border-line bg-paper p-2" key={photo.key}>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview */}
              <img alt={`Foto ${index + 1}`} className="aspect-[3/4] w-full rounded object-cover" src={photo.url} />
              <span className="text-[13px] text-ink-soft">
                Foto {index + 1} · {formatFileSize(photo.file.size)}
              </span>
              <Button
                aria-label={`Quitar la foto ${index + 1}`}
                className="min-h-11 px-3 text-sm"
                onClick={() => remove(photo.key)}
                variant="secondary"
              >
                Quitar
              </Button>
            </li>
          ))}
        </ol>
      ) : null}

      {photos.length > 0 ? (
        <p className="m-0 text-[13px] text-ink-muted">
          {photos.length} de {DIGITIZATION_LIMITS.maxPhotos} fotos · {formatFileSize(totalBytes)} de 12 MB
        </p>
      ) : null}
      {tooHeavy ? <Notice tone="error">Las fotos superan el límite total de 12 MB.</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-wrap gap-3">
        <Button disabled={preparing || tooHeavy} onClick={submit}>
          Digitalizar carta
        </Button>
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
      </div>

      <ConfirmDialog
        confirmLabel="Reemplazar mi borrador"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onStart(photos.map((photo) => photo.file));
        }}
        open={confirming}
        title="¿Reemplazar tu borrador?"
      >
        <p className="m-0">{DIGITIZATION_TEXTS.replaceWarning}</p>
      </ConfirmDialog>
    </div>
  );
}
