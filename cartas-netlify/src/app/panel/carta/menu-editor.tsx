'use client';

import { useEffect, useRef, useState } from 'react';

import { sendJson } from '@/components/forms/send-json';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { ConfirmDialog, Sheet } from '@/components/ui/dialogs';
import { Card, Notice, StatusPill } from '@/components/ui/surfaces';
import { GENERIC_ERROR_MESSAGE } from '@/shared/messages';
import {
  formatPrice,
  parseMenuDraft,
  type DraftCategory,
  type DraftProduct,
  type MenuDraft,
  type MoveDirection,
} from '@/shared/menu';

import { ProductForm, SectionForm, type ProductFormValues, type SaveResult } from './forms';

type Editing =
  | { kind: 'new-section' }
  | { kind: 'section'; section: DraftCategory }
  | { kind: 'new-product'; categoryId: string }
  | { kind: 'product'; product: DraftProduct; categoryId: string }
  | null;

type Deleting =
  | { kind: 'section'; section: DraftCategory }
  | { kind: 'product'; product: DraftProduct }
  | null;

const smallButton = 'min-h-11 px-3 text-sm';

function moveButtonId(id: string, direction: MoveDirection): string {
  return `mover-${id}-${direction}`;
}

function productsWillBeDeleted(count: number): string {
  if (count === 0) return 'La sección no tiene productos.';
  if (count === 1) return 'También se eliminará su único producto.';
  return `También se eliminarán sus ${count} productos.`;
}

export function MenuEditor({ initialDraft }: { initialDraft: MenuDraft }) {
  const [draft, setDraft] = useState(initialDraft);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // After «Subir» / «Bajar» the list re-renders; the focus goes back to that button.
  const focusAfterMove = useRef<{ id: string; direction: MoveDirection } | null>(null);

  const locked = draft.digitizationInProgress;
  const disabled = busy || locked;

  useEffect(() => {
    const target = focusAfterMove.current;
    if (!target) return;
    focusAfterMove.current = null;
    const same = document.getElementById(moveButtonId(target.id, target.direction));
    const other = document.getElementById(
      moveButtonId(target.id, target.direction === 'up' ? 'down' : 'up'),
    );
    const button = same instanceof HTMLButtonElement && !same.disabled ? same : other;
    button?.focus();
  }, [draft]);

  /** Sends a change; on success the answer carries the whole updated draft. */
  async function change(
    url: string,
    method: 'DELETE' | 'PATCH' | 'POST',
    body?: unknown,
  ): Promise<SaveResult> {
    setBusy(true);
    setNotice(null);
    const result = await sendJson(url, method, body);
    setBusy(false);
    if (!result.ok) {
      if (result.error.code === 'DIGITIZATION_IN_PROGRESS') {
        setDraft((current) => ({ ...current, digitizationInProgress: true }));
      }
      return { fields: result.error.fields, message: result.error.message, ok: false };
    }
    const next = parseMenuDraft(result.data);
    if (!next) return { message: GENERIC_ERROR_MESSAGE, ok: false };
    setDraft(next);
    return { ok: true };
  }

  /** For actions outside a form: the error goes to the notice above the menu. */
  async function act(url: string, method: 'DELETE' | 'POST', body?: unknown): Promise<boolean> {
    const result = await change(url, method, body);
    if (!result.ok) setNotice(result.message ?? GENERIC_ERROR_MESSAGE);
    return result.ok;
  }

  async function move(kind: 'secciones' | 'productos', id: string, direction: MoveDirection) {
    focusAfterMove.current = { direction, id };
    if (!(await act(`/api/carta/${kind}/${id}/mover`, 'POST', { direction }))) {
      focusAfterMove.current = null;
    }
  }

  async function saveProduct(values: ProductFormValues): Promise<SaveResult> {
    if (editing?.kind !== 'new-product' && editing?.kind !== 'product') return { ok: false };
    const result =
      editing.kind === 'product'
        ? await change(`/api/carta/productos/${editing.product.id}`, 'PATCH', values)
        : await change('/api/carta/productos', 'POST', values);
    if (result.ok) setEditing(null);
    return result;
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    const url =
      deleting.kind === 'section'
        ? `/api/carta/secciones/${deleting.section.id}`
        : `/api/carta/productos/${deleting.product.id}`;
    const ok = await act(url, 'DELETE');
    setDeleting(null);
    if (ok && deleting.kind === 'product') setEditing(null);
  }

  const sheetTitle =
    editing?.kind === 'new-section'
      ? 'Nueva sección'
      : editing?.kind === 'section'
        ? 'Editar sección'
        : editing?.kind === 'new-product'
          ? 'Nuevo producto'
          : 'Editar producto';

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="m-0 font-display text-3xl font-semibold tracking-tight">Carta</h1>
          <p className="m-0 text-[15px] text-ink-soft">
            Organiza tus secciones y productos. Los cambios no se ven en tu carta pública hasta que la publiques.
          </p>
        </div>
        <Button disabled={disabled} onClick={() => setEditing({ kind: 'new-section' })}>
          Nueva sección
        </Button>
      </div>

      {locked ? (
        <Notice tone="warning">
          Estamos digitalizando tu carta. Podrás editarla en cuanto termine.
        </Notice>
      ) : null}
      {notice ? <Notice tone="error">{notice}</Notice> : null}

      {draft.categories.length === 0 ? (
        <Card className="grid justify-items-start gap-4 p-6">
          <p className="m-0 text-[15px] text-ink-soft">
            Tu carta está vacía. Crea tu primera sección o digitaliza tu carta desde fotos.
          </p>
          <Button disabled={disabled} onClick={() => setEditing({ kind: 'new-section' })} variant="secondary">
            Crear la primera sección
          </Button>
        </Card>
      ) : (
        draft.categories.map((section, sectionIndex) => (
          <Card className="overflow-hidden" key={section.id}>
            <section aria-labelledby={`seccion-${section.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="grid min-w-0 gap-0.5">
                  <h2 className="m-0 font-display text-xl font-semibold" id={`seccion-${section.id}`}>
                    {section.name}
                  </h2>
                  <p className="m-0 text-[13px] text-ink-muted">
                    {section.layout === 'CARDS' ? 'Diseño en tarjetas' : 'Diseño en lista'} ·{' '}
                    {section.products.length === 1 ? '1 producto' : `${section.products.length} productos`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    aria-label={`Subir sección ${section.name}`}
                    className={smallButton}
                    disabled={disabled || sectionIndex === 0}
                    id={moveButtonId(section.id, 'up')}
                    onClick={() => move('secciones', section.id, 'up')}
                    variant="secondary"
                  >
                    Subir
                  </Button>
                  <Button
                    aria-label={`Bajar sección ${section.name}`}
                    className={smallButton}
                    disabled={disabled || sectionIndex === draft.categories.length - 1}
                    id={moveButtonId(section.id, 'down')}
                    onClick={() => move('secciones', section.id, 'down')}
                    variant="secondary"
                  >
                    Bajar
                  </Button>
                  <Button
                    aria-label={`Editar sección ${section.name}`}
                    className={smallButton}
                    disabled={disabled}
                    onClick={() => setEditing({ kind: 'section', section })}
                    variant="secondary"
                  >
                    Editar
                  </Button>
                  <Button
                    aria-label={`Eliminar sección ${section.name}`}
                    className={smallButton}
                    disabled={disabled}
                    onClick={() => setDeleting({ kind: 'section', section })}
                    variant="danger"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>

              {section.products.length === 0 ? (
                <p className="m-0 px-5 py-4 text-sm text-ink-muted">Esta sección aún no tiene productos.</p>
              ) : (
                <ul className="m-0 list-none p-0" role="list">
                  {section.products.map((product, productIndex) => (
                    <li
                      className="grid gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"
                      key={product.id}
                    >
                      <div className="grid min-w-0 gap-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <h3
                            className={cn('m-0 text-base font-semibold', !product.isAvailable && 'text-ink-muted')}
                          >
                            {product.name}
                          </h3>
                          <p className="m-0 font-semibold tabular-nums">{formatPrice(product.basePrice)}</p>
                        </div>
                        {product.description ? (
                          <p className="m-0 line-clamp-2 text-sm text-ink-soft">{product.description}</p>
                        ) : null}
                        {product.isAvailable ? null : (
                          <span>
                            <StatusPill tone="neutral">No disponible</StatusPill>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          aria-label={`Subir ${product.name}`}
                          className={smallButton}
                          disabled={disabled || productIndex === 0}
                          id={moveButtonId(product.id, 'up')}
                          onClick={() => move('productos', product.id, 'up')}
                          variant="secondary"
                        >
                          Subir
                        </Button>
                        <Button
                          aria-label={`Bajar ${product.name}`}
                          className={smallButton}
                          disabled={disabled || productIndex === section.products.length - 1}
                          id={moveButtonId(product.id, 'down')}
                          onClick={() => move('productos', product.id, 'down')}
                          variant="secondary"
                        >
                          Bajar
                        </Button>
                        <Button
                          aria-label={`Editar ${product.name}`}
                          className={smallButton}
                          disabled={disabled}
                          onClick={() => setEditing({ categoryId: section.id, kind: 'product', product })}
                          variant="secondary"
                        >
                          Editar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-line px-5 py-4">
                <Button
                  aria-label={`Agregar producto a ${section.name}`}
                  disabled={disabled}
                  onClick={() => setEditing({ categoryId: section.id, kind: 'new-product' })}
                  variant="secondary"
                >
                  Agregar producto
                </Button>
              </div>
            </section>
          </Card>
        ))
      )}

      <Sheet onClose={() => setEditing(null)} open={editing !== null} title={sheetTitle}>
        {editing?.kind === 'new-section' || editing?.kind === 'section' ? (
          <SectionForm
            initial={
              editing.kind === 'section'
                ? { layout: editing.section.layout, name: editing.section.name }
                : { layout: 'LIST', name: '' }
            }
            onCancel={() => setEditing(null)}
            onSave={async (values) => {
              const result =
                editing.kind === 'section'
                  ? await change(`/api/carta/secciones/${editing.section.id}`, 'PATCH', values)
                  : await change('/api/carta/secciones', 'POST', values);
              if (result.ok) setEditing(null);
              return result;
            }}
            submitLabel={editing.kind === 'section' ? 'Guardar sección' : 'Crear sección'}
          />
        ) : null}
        {editing?.kind === 'new-product' || editing?.kind === 'product' ? (
          <ProductForm
            categories={draft.categories}
            initial={
              editing.kind === 'product'
                ? {
                    basePrice: editing.product.basePrice,
                    categoryId: editing.categoryId,
                    description: editing.product.description ?? '',
                    isAvailable: editing.product.isAvailable,
                    name: editing.product.name,
                  }
                : { basePrice: '', categoryId: editing.categoryId, description: '', isAvailable: true, name: '' }
            }
            onCancel={() => setEditing(null)}
            onDelete={
              editing.kind === 'product'
                ? () => setDeleting({ kind: 'product', product: editing.product })
                : undefined
            }
            onSave={saveProduct}
            submitLabel={editing.kind === 'product' ? 'Guardar producto' : 'Agregar producto'}
          />
        ) : null}
      </Sheet>

      <ConfirmDialog
        confirmLabel={deleting?.kind === 'section' ? 'Eliminar sección' : 'Eliminar producto'}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        open={deleting !== null}
        pending={busy}
        title={
          deleting?.kind === 'section'
            ? `¿Eliminar la sección «${deleting.section.name}»?`
            : `¿Eliminar «${deleting?.product.name ?? ''}»?`
        }
      >
        <p className="m-0">
          {deleting?.kind === 'section'
            ? productsWillBeDeleted(deleting.section.products.length)
            : 'Se quitará de tu carta.'}{' '}
          Esta acción no se puede deshacer.
        </p>
      </ConfirmDialog>
    </div>
  );
}
