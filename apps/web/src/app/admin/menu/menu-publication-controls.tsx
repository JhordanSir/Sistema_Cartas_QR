'use client';

import { useEffect, useRef, useState } from 'react';

import type { PublishedMenu, RestaurantProfile } from '@/lib/restaurant-types';

const TEMPLATES: Array<{
  description: string;
  id: PublishedMenu['template'];
  label: string;
}> = [
  { description: 'Estilo interpretado desde tu carta.', id: 'ORIGINAL', label: 'Original' },
  { description: 'Clásico, como una carta de mesa.', id: 'TRADITIONAL', label: 'Tradicional' },
  { description: 'Fresco y muy legible en celular.', id: 'CASUAL', label: 'Casual' },
  { description: 'Oscuro, cálido y más sobrio.', id: 'PREMIUM', label: 'Premium' },
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const canPublish = menu.publication.hasUnpublishedChanges;
  const hasDraft = menu.categories.some((category) =>
    category.products.some((product) => product.isAvailable !== false),
  );

  useDialog(previewDialog, previewOpen, setPreviewOpen);
  useDialog(confirmationDialog, confirmationOpen, setConfirmationOpen);

  async function confirmPublication() {
    await onPublish();
    setConfirmationOpen(false);
  }

  return (
    <>
      <section className="publication-ticket" aria-labelledby="publication-title">
        <div className="publication-ticket-heading">
          <span className="ticket-notch" aria-hidden="true">✦</span>
          <div>
            <span className="kicker">Orden de publicación</span>
            <h2 id="publication-title">
              {menu.publication.hasUnpublishedChanges
                ? 'Tienes cambios por publicar'
                : menu.publication.hasPublishedMenu
                  ? 'La carta pública está al día'
                  : 'Prepara la primera carta'}
            </h2>
          </div>
          <span className={`publication-state${menu.publication.hasUnpublishedChanges ? ' is-draft' : ''}`}>
            {menu.publication.hasUnpublishedChanges ? 'Borrador' : menu.publication.hasPublishedMenu ? 'En vivo' : 'Sin publicar'}
          </span>
        </div>
        <p>
          {menu.publication.hasUnpublishedChanges
            ? 'La versión que ven tus clientes no cambia hasta que confirmes la publicación.'
            : menu.publication.hasPublishedMenu
              ? 'Tu QR sigue mostrando esta versión. Puedes editar con tranquilidad.'
              : 'Tu QR mostrará “Próximamente” hasta que publiques al menos un producto disponible.'}
        </p>
        <div className="template-selector" aria-label="Plantilla del borrador">
          <span>Plantilla del borrador</span>
          <div role="radiogroup">
            {TEMPLATES.map((template) => (
              <button
                aria-checked={menu.template === template.id}
                className={menu.template === template.id ? 'is-selected' : ''}
                disabled={templateSaving || menu.template === template.id}
                key={template.id}
                onClick={() => void onTemplate(template.id)}
                role="radio"
                title={template.description}
                type="button"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
        <div className="publication-actions">
          <button className="button button-secondary" onClick={() => setPreviewOpen(true)} type="button">
            Previsualizar borrador
          </button>
          <button
            className="button button-primary"
            disabled={!canPublish || !hasDraft || publishing}
            onClick={() => setConfirmationOpen(true)}
            type="button"
          >
            {publishing ? 'Publicando…' : menu.publication.hasPublishedMenu ? 'Publicar cambios' : 'Publicar carta'}
          </button>
        </div>
      </section>

      <dialog className="menu-preview-dialog" onClose={() => setPreviewOpen(false)} ref={previewDialog}>
        <div className="menu-preview-dialog-bar">
          <div><span className="kicker">Solo tú ves esto</span><strong>Previsualización del borrador</strong></div>
          <button aria-label="Cerrar previsualización" onClick={() => setPreviewOpen(false)} type="button">×</button>
        </div>
        <section
          className="draft-menu-preview"
          style={{
            '--menu-background': menu.style.backgroundColor,
            '--menu-foreground': menu.style.textColor,
            '--menu-font': menu.style.fontFamily,
          } as React.CSSProperties}
        >
          <span>Carta digital · borrador</span>
          <h2>{restaurant.name}</h2>
          {menu.categories.flatMap((category) => category.products.filter((product) => product.isAvailable !== false).map((product) => ({ category, product }))).length === 0 ? (
            <p className="draft-preview-empty">Agrega un producto disponible para revisar tu carta.</p>
          ) : menu.categories.map((category) => {
            const products = category.products.filter((product) => product.isAvailable !== false);
            if (products.length === 0) return null;
            return (
              <section key={category.id ?? category.name}>
                <h3>{category.name}</h3>
                {products.map((product) => (
                  <article key={product.id ?? product.name}>
                    <div><strong>{product.name}</strong>{product.description ? <p>{product.description}</p> : null}</div>
                    <b>S/ {product.basePrice}</b>
                  </article>
                ))}
              </section>
            );
          })}
        </section>
      </dialog>

      <dialog className="publish-confirmation-dialog" onClose={() => setConfirmationOpen(false)} ref={confirmationDialog}>
        <form method="dialog">
          <span className="kicker">Confirmar publicación</span>
          <h2>Actualiza la carta que ve tu QR.</h2>
          <p>La versión anterior dejará de mostrarse y este borrador será la nueva carta pública. El enlace del QR no cambia.</p>
          <div className="dialog-actions">
            <button className="button button-secondary" type="submit">Volver a revisar</button>
            <button className="button button-primary" disabled={publishing} onClick={() => void confirmPublication()} type="button">
              {publishing ? 'Publicando…' : 'Sí, publicar carta'}
            </button>
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
