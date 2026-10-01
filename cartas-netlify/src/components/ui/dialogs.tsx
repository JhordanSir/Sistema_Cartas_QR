'use client';

import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react';

import { Button } from './button';
import { cn } from './cn';

// Modal dialogs on the native <dialog>: showModal() makes the rest of the page
// inert, keeps the focus inside and closes with Escape. React state is the
// single source of truth for whether a dialog is open.

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // The page behind a modal must not scroll.
      document.documentElement.style.overflow = 'hidden';
    }
    if (!open && dialog.open) dialog.close();
    return () => {
      if (open) document.documentElement.style.overflow = '';
    };
  }, [open]);
  return ref;
}

function cancelInstead(onClose: () => void) {
  return (event: SyntheticEvent<HTMLDialogElement>) => {
    // Escape: let React close it, so state and DOM never disagree.
    event.preventDefault();
    onClose();
  };
}

/**
 * Editing panel: full screen on a phone, a column on the right from 640 px.
 * Children render only while open, so every opening starts from fresh state.
 */
export function Sheet({
  children,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const ref = useModal(open);
  const titleId = useId();

  return (
    <dialog
      aria-labelledby={titleId}
      className={cn(
        'm-0 h-dvh max-h-none w-full max-w-none border-0 bg-raised p-0 text-ink backdrop:bg-ink/40',
        'sm:ml-auto sm:max-w-md sm:border-l sm:border-line sm:shadow-card',
      )}
      onCancel={cancelInstead(onClose)}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (event.target === event.currentTarget) onClose();
      }}
      ref={ref}
    >
      {open ? (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-2">
            <h2 className="m-0 font-display text-xl font-semibold" id={titleId}>
              {title}
            </h2>
            <Button onClick={onClose} variant="secondary">
              Cerrar
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}

/** «¿Seguro?» before something that cannot be undone. The focus starts on «Cancelar». */
export function ConfirmDialog({
  children,
  confirmLabel,
  onCancel,
  onConfirm,
  open,
  pending = false,
  title,
  tone = 'danger',
}: {
  children: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
  /** `primary` for actions that are not destructive, such as publishing. */
  tone?: 'danger' | 'primary';
}) {
  const ref = useModal(open);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-line bg-raised p-6 text-ink',
        'shadow-card backdrop:bg-ink/40',
      )}
      onCancel={cancelInstead(onCancel)}
      ref={ref}
      role="alertdialog"
    >
      {open ? (
        <div className="grid gap-3">
          <h2 className="m-0 font-display text-xl font-semibold" id={titleId}>
            {title}
          </h2>
          <div className="text-[15px] text-ink-soft" id={descriptionId}>
            {children}
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-3">
            <Button disabled={pending} onClick={onCancel} ref={cancelRef} variant="secondary">
              Cancelar
            </Button>
            <Button disabled={pending} onClick={onConfirm} variant={tone}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
