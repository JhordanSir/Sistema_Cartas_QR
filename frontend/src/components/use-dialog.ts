'use client';

import { type RefObject, useEffect } from 'react';

/**
 * Drives a native <dialog> from state: `open` shows it as a modal or closes it, and
 * closing it with Escape sets the state back, so the two never disagree.
 */
export function useDialog(
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
  setOpen: (open: boolean) => void,
): void {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, ref]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = () => setOpen(false);
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [ref, setOpen]);
}
