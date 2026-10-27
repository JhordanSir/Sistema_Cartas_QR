import type { ReactNode } from 'react';

/**
 * Panel classes for the overlay editors. Exported as a string because the panel is
 * usually a <form> and callers need to keep their own props and aria wiring.
 *
 * On a phone the panel fills the screen and scrolls; from md it becomes a centred
 * card.
 */
export const modalPanel =
  'grid max-h-dvh w-full gap-4 overflow-y-auto bg-paper-raised p-6 shadow-raised ' +
  'md:max-h-[calc(100dvh-2.5rem)] md:w-[min(100%,32rem)] md:rounded-2xl md:p-8';

export const modalPanelWide = 'md:w-[min(100%,47.5rem)]';

export function ModalBackdrop({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-ink/60 backdrop-blur-[3px] md:p-5"
      role="presentation"
    >
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {children}
    </footer>
  );
}
