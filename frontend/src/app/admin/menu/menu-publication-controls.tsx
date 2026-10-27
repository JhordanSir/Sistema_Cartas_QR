'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/button';
import { Kicker, StatusPill } from '@/components/surfaces';
import { formatCurrency } from '@/i18n/format';
import { useCopy, useLocale } from '@/i18n/locale-provider';
import { ownerMenuCopy } from '@/i18n/messages/owner-menu';
import { menuFontClassName } from '@/lib/menu-fonts';
import type { PublishedMenu, RestaurantProfile } from '@/lib/restaurant-types';

const TEMPLATES: ReadonlyArray<PublishedMenu['template']> = [
  'ORIGINAL',
  'TRADITIONAL',
  'CASUAL',
  'PREMIUM',
];

interface MenuPublicationControlsProps {
  menu: PublishedMenu;
  onPublish: () => Promise<void>;
  onTemplate: (template: PublishedMenu['template']) => Promise<void>;
  publishing: boolean;
  restaurant: RestaurantProfile;
  templateSaving: boolean;
}

export function MenuPublicationControls({
  menu,
  onPublish,
  onTemplate,
  publishing,
  restaurant,
  templateSaving,
}: MenuPublicationControlsProps) {
  const locale = useLocale();
  const copy = useCopy(ownerMenuCopy).publication;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const canPublish = menu.publication.hasUnpublishedChanges;
  const hasDraft = menu.categories.some((category) =>
    category.products.some((product) => product.isAvailable !== false),
  );
  const state = menu.publication.hasUnpublishedChanges
    ? 'changes'
    : menu.publication.hasPublishedMenu
      ? 'live'
      : 'first';

  useDialog(previewDialog, previewOpen, setPreviewOpen);
  useDialog(confirmationDialog, confirmationOpen, setConfirmationOpen);

  async function confirmPublication() {
    await onPublish();
    setConfirmationOpen(false);
  }

  return (
    <>
      <section
        aria-labelledby="publication-title"
        className="relative mb-6 overflow-hidden rounded-2xl border-t-[3px] border-t-teal bg-paper p-6 shadow-soft sm:p-8"
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-wash text-lg text-teal"
          >
            ✦
          </span>
          <div className="min-w-0 flex-1">
            <Kicker tone="teal">{copy.kicker}</Kicker>
            <h2
              className="mt-1 mb-0 font-display text-2xl tracking-[-0.025em]"
              id="publication-title"
            >
              {copy.heading[state]}
            </h2>
          </div>
          <div className="shrink-0">
            <StatusPill tone={state === 'changes' ? 'draft' : state === 'live' ? 'positive' : 'muted'}>
              {state === 'changes'
                ? copy.pill.draft
                : state === 'live'
                  ? copy.pill.live
                  : copy.pill.unpublished}
            </StatusPill>
          </div>
        </div>
        <p className="mt-2 mb-0 max-w-[64ch] text-[13px]/relaxed text-ink-soft sm:ml-12.5">
          {copy.status[state]}
        </p>

        <div aria-label={copy.templateLabel} className="mt-4 grid gap-2 border-t border-line pt-4">
          <span className="text-[10px] font-black tracking-[0.1em] text-ink-muted uppercase">
            {copy.templateLabel}
          </span>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {TEMPLATES.map((template) => (
              <button
                aria-checked={menu.template === template}
                className={`min-h-11 rounded-lg border px-3 text-[11px] font-bold transition-colors duration-150 ease-soft active:scale-[0.97] disabled:cursor-wait ${
                  menu.template === template
                    ? 'border-teal bg-teal-wash text-teal'
                    : 'border-line-strong bg-paper text-ink-soft hover:border-teal hover:text-teal'
                }`}
                disabled={templateSaving || menu.template === template}
                key={template}
                onClick={() => void onTemplate(template)}
                role="radio"
                title={copy.templates[template].description}
                type="button"
              >
                {copy.templates[template].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
          <Button onClick={() => setPreviewOpen(true)} tone="secondary">
            {copy.preview}
          </Button>
          <Button
            disabled={!canPublish || !hasDraft || publishing}
            onClick={() => setConfirmationOpen(true)}
          >
            {publishing
              ? copy.publishing
              : menu.publication.hasPublishedMenu
                ? copy.publishChanges
                : copy.publishFirst}
          </Button>
        </div>
      </section>

      <dialog
        className="max-h-[calc(100dvh-2rem)] w-[min(calc(100%-2rem),47.5rem)] overflow-auto rounded-2xl bg-paper-raised p-0 shadow-raised backdrop:bg-ink/55 backdrop:backdrop-blur-[3px]"
        onClose={() => setPreviewOpen(false)}
        ref={previewDialog}
      >
        <div className="flex items-center justify-between gap-5 border-b border-line px-5 py-4 sm:px-6">
          <div className="grid gap-1">
            <Kicker tone="teal">{copy.previewDialog.kicker}</Kicker>
            <strong className="font-display text-xl">{copy.previewDialog.title}</strong>
          </div>
          <button
            aria-label={copy.previewDialog.close}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-control text-2xl/none text-ink"
            onClick={() => setPreviewOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>
        <section
          className={`menu-themed grid min-h-[28rem] gap-6 p-6 sm:p-10 lg:p-13 ${menuFontClassName(menu.style.fontFamily)}`}
          style={{
            '--menu-background': menu.style.backgroundColor,
            '--menu-foreground': menu.style.textColor,
          } as React.CSSProperties}
        >
          <span className="text-[10px] font-extrabold tracking-[0.1em] uppercase opacity-65">
            {copy.previewDialog.eyebrow}
          </span>
          <h2 className="-mt-2.5 mb-1 max-w-[16ch] text-4xl leading-[0.98] sm:text-5xl">
            {restaurant.name}
          </h2>
          {!hasDraft ? (
            <p className="m-0 opacity-75">{copy.previewDialog.empty}</p>
          ) : (
            menu.categories.map((category) => {
              const products = category.products.filter(
                (product) => product.isAvailable !== false,
              );
              if (products.length === 0) return null;
              return (
                <section
                  className="grid gap-2 border-t border-current/20 pt-5"
                  key={category.id ?? category.name}
                >
                  <h3 className="mt-0 mb-1 text-[13px] tracking-[0.1em] uppercase">
                    {category.name}
                  </h3>
                  {products.map((product) => (
                    <article
                      className="flex items-baseline justify-between gap-4 border-t border-current/15 py-3"
                      key={product.id ?? product.name}
                    >
                      <div>
                        <strong className="text-[15px]">{product.name}</strong>
                        {product.description ? (
                          <p className="mt-1 mb-0 text-xs/snug opacity-75">{product.description}</p>
                        ) : null}
                      </div>
                      <b className="text-[15px] whitespace-nowrap">
                        {formatCurrency(product.basePrice, locale)}
                      </b>
                    </article>
                  ))}
                </section>
              );
            })
          )}
        </section>
      </dialog>

      <dialog
        className="w-[min(calc(100%-2rem),32.5rem)] rounded-2xl bg-paper-raised p-0 shadow-raised backdrop:bg-ink/55 backdrop:backdrop-blur-[3px]"
        onClose={() => setConfirmationOpen(false)}
        ref={confirmationDialog}
      >
        <form className="grid gap-4 p-6 sm:p-8" method="dialog">
          <Kicker>{copy.confirm.kicker}</Kicker>
          <h2 className="-mt-2 mb-0 font-display text-2xl tracking-[-0.03em] sm:text-3xl">
            {copy.confirm.title}
          </h2>
          <p className="m-0 text-[13px]/relaxed text-ink-soft">{copy.confirm.body}</p>
          <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button tone="secondary" type="submit">
              {copy.confirm.back}
            </Button>
            <Button disabled={publishing} onClick={() => void confirmPublication()}>
              {publishing ? copy.publishing : copy.confirm.accept}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function useDialog(
  ref: React.RefObject<HTMLDialogElement | null>,
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
