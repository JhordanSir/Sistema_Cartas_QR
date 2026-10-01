'use client';

import { useRef, useState, type ChangeEvent } from 'react';

import { prepareImage } from '@/components/forms/prepare-image';
import { sendForm, sendJson, type JsonResult } from '@/components/forms/send-json';
import { Button } from '@/components/ui/button';
import { ACCEPTED_IMAGE_TYPES, IMAGE_MESSAGES, PRODUCT_IMAGE_MAX_BYTES } from '@/shared/images';
import { parseMenuDraft, type DraftProduct, type MenuDraft } from '@/shared/menu';
import { GENERIC_ERROR_MESSAGE } from '@/shared/messages';

/**
 * Photo of a saved product. Changing or removing it applies at once, apart
 * from the product form, and the editor receives the updated draft.
 */
export function ProductImageEditor({
  disabled,
  onDraft,
  product,
}: {
  disabled: boolean;
  onDraft: (draft: MenuDraft) => void;
  product: DraftProduct;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState<'subiendo' | 'quitando' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/carta/productos/${product.id}/imagen`;

  function apply(result: JsonResult): void {
    if (!result.ok) {
      setError(result.error.fields?.image ?? result.error.message);
      return;
    }
    const draft = parseMenuDraft(result.data);
    if (draft) onDraft(draft);
    else setError(GENERIC_ERROR_MESSAGE);
  }

  async function choose(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setWorking('subiendo');
    const prepared = await prepareImage(file, {
      maxBytes: PRODUCT_IMAGE_MAX_BYTES,
      tooLargeMessage: IMAGE_MESSAGES.productImageTooLarge,
    });
    if (!prepared.ok) {
      setWorking(null);
      setError(prepared.error);
      return;
    }
    const body = new FormData();
    body.set('image', prepared.file);
    const result = await sendForm(url, 'PUT', body);
    setWorking(null);
    apply(result);
  }

  async function remove(): Promise<void> {
    setError(null);
    setWorking('quitando');
    const result = await sendJson(url, 'DELETE');
    setWorking(null);
    apply(result);
  }

  const busy = disabled || working !== null;

  return (
    <div className="grid gap-3 border-b border-line pb-5">
      <p className="m-0 text-sm font-semibold text-ink-soft" id="product-image-label">
        Foto del producto
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-card border border-line bg-control">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- /media URLs served by our own route
            <img alt={`Foto de ${product.name}`} className="h-full w-full object-cover" src={product.imageUrl} />
          ) : (
            <span className="px-2 text-center text-xs text-ink-muted">Sin foto</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            accept={ACCEPTED_IMAGE_TYPES}
            aria-labelledby="product-image-label"
            className="sr-only"
            onChange={choose}
            ref={input}
            tabIndex={-1}
            type="file"
          />
          <Button
            aria-describedby="product-image-hint"
            disabled={busy}
            onClick={() => input.current?.click()}
            variant="secondary"
          >
            {product.imageUrl ? 'Cambiar imagen' : 'Agregar imagen'}
          </Button>
          {product.imageUrl ? (
            <Button disabled={busy} onClick={remove} variant="secondary">
              Quitar imagen
            </Button>
          ) : null}
        </div>
      </div>
      <p className="m-0 text-[13px] text-ink-muted" id="product-image-hint">
        PNG, JPG o WebP. Si pesa más de 4 MB o mide más de 1600 px, la reducimos antes de subirla.
      </p>
      <p className="m-0 min-h-5 text-[13px] text-ink-soft" role="status">
        {working === 'subiendo' ? 'Subiendo la imagen…' : working === 'quitando' ? 'Quitando la imagen…' : null}
      </p>
      {error ? (
        <p className="m-0 text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
