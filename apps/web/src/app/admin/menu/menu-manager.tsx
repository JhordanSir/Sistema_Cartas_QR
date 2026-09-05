'use client';

import { type FormEvent, useState } from 'react';

import { ActionSheet } from '@/components/action-sheet';
import { Button, InlineAction, TextAction } from '@/components/button';
import { Field, fieldControl } from '@/components/field';
import { ModalBackdrop, ModalFooter, modalPanel, modalPanelWide } from '@/components/modal';
import type {
  MenuCategory,
  MenuOption,
  MenuProduct,
  PublishedMenu,
  RestaurantProfile,
} from '@/lib/restaurant-types';

interface MenuManagerProps {
  menu: PublishedMenu;
  restaurant: RestaurantProfile;
  setError: (message: string | null) => void;
  setMenu: (menu: PublishedMenu) => void;
  setNotice: (message: string | null) => void;
}

interface ManagedCategory extends MenuCategory {
  id: string;
}

interface ManagedProduct extends MenuProduct {
  id: string;
}

interface OptionDraft {
  name: string;
  price: string;
}

interface ProductDraft {
  basePrice: string;
  categoryId: string;
  description: string;
  extras: OptionDraft[];
  image: File | null;
  name: string;
  product: ManagedProduct | null;
  removeImage: boolean;
  variants: OptionDraft[];
}

export function MenuManager({
  menu,
  restaurant,
  setError,
  setMenu,
  setNotice,
}: MenuManagerProps) {
  const [categoryEditor, setCategoryEditor] = useState<ManagedCategory | 'new' | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);

  const categories = menu.categories.filter(hasId);

  async function mutate(path: string, init: RequestInit): Promise<PublishedMenu | null> {
    setBusy(path);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/owner/restaurants/${restaurant.id}/menu${path}`,
        init,
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return null;
      }
      const nextMenu = (await response.json()) as PublishedMenu;
      setMenu(nextMenu);
      return nextMenu;
    } finally {
      setBusy(null);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryEditor) return;
    const data = new FormData(event.currentTarget);
    const editing = categoryEditor !== 'new';
    const nextMenu = await mutate(
      editing ? `/categories/${categoryEditor.id}` : '/categories',
      {
        body: JSON.stringify({ name: data.get('name') }),
        headers: { 'content-type': 'application/json' },
        method: editing ? 'PATCH' : 'POST',
      },
    );
    if (nextMenu) {
      setCategoryEditor(null);
      setNotice(editing ? 'Sección actualizada en el borrador.' : 'Sección creada en el borrador.');
    }
  }

  async function deleteCategory(category: ManagedCategory) {
    if (!window.confirm(`¿Eliminar “${category.name}” y todos sus productos permanentemente?`)) {
      return;
    }
    const nextMenu = await mutate(`/categories/${category.id}`, { method: 'DELETE' });
    if (nextMenu) setNotice('Sección y productos eliminados del borrador.');
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const ordered = categories.map((category) => category.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
    const nextMenu = await mutate('/categories-order', jsonRequest('PUT', { orderedIds: ordered }));
    if (nextMenu) setNotice('Orden de secciones actualizado en el borrador.');
  }

  function openProduct(categoryId: string, product: ManagedProduct | null = null) {
    setProductDraft({
      basePrice: product?.basePrice ?? '',
      categoryId,
      description: product?.description ?? '',
      extras: product?.extras.map(toOptionDraft) ?? [],
      image: null,
      name: product?.name ?? '',
      product,
      removeImage: false,
      variants: product?.variants.map(toOptionDraft) ?? [],
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productDraft) return;
    const previousIds = new Set(menu.categories.flatMap((category) =>
      category.products.flatMap((product) => product.id ? [product.id] : [])));
    const payload = {
      basePrice: productDraft.basePrice,
      categoryId: productDraft.categoryId,
      description: productDraft.description,
      extras: productDraft.extras,
      name: productDraft.name,
      variants: productDraft.variants,
    };
    let nextMenu = await mutate(
      productDraft.product ? `/products/${productDraft.product.id}` : '/products',
      jsonRequest(productDraft.product ? 'PATCH' : 'POST', payload),
    );
    if (!nextMenu) return;

    const productId = productDraft.product?.id ?? nextMenu.categories
      .flatMap((category) => category.products)
      .find((product) => product.id && !previousIds.has(product.id))?.id;
    if (!productId) {
      setError('El producto se guardó, pero no pudimos identificarlo para procesar la imagen.');
      return;
    }
    if (productDraft.image) {
      const body = new FormData();
      body.set('image', productDraft.image);
      nextMenu = await mutate(`/products/${productId}/image`, { body, method: 'PUT' });
    } else if (productDraft.removeImage && productDraft.product?.imagePath) {
      nextMenu = await mutate(`/products/${productId}/image`, { method: 'DELETE' });
    }
    if (nextMenu) {
      setProductDraft(null);
      setNotice(productDraft.product ? 'Producto actualizado en el borrador.' : 'Producto creado en el borrador.');
    }
  }

  async function toggleAvailability(product: ManagedProduct) {
    const nextAvailable = product.isAvailable === false;
    const nextMenu = await mutate(
      `/products/${product.id}/availability`,
      jsonRequest('PATCH', { isAvailable: nextAvailable }),
    );
    if (nextMenu) {
      setNotice(nextAvailable
        ? 'Producto marcado como disponible en el borrador.'
        : 'Producto marcado como no disponible en el borrador.');
    }
  }

  async function deleteProduct(product: ManagedProduct) {
    if (!window.confirm(`¿Eliminar “${product.name}” permanentemente?`)) return;
    const nextMenu = await mutate(`/products/${product.id}`, { method: 'DELETE' });
    if (nextMenu) setNotice('Producto eliminado del borrador.');
  }

  async function moveProduct(category: ManagedCategory, index: number, direction: -1 | 1) {
    const products = category.products.filter(hasId);
    const ordered = products.map((product) => product.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
    const nextMenu = await mutate(
      `/categories/${category.id}/products-order`,
      jsonRequest('PUT', { orderedIds: ordered }),
    );
    if (nextMenu) setNotice('Orden de productos actualizado en el borrador.');
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-y border-line px-5 py-2 text-[11px] font-bold text-ink-muted sm:px-8">
        <span>
          {categories.length} secciones · {countProducts(menu)} productos
        </span>
        <TextAction onClick={() => setCategoryEditor('new')}>+ Nueva sección</TextAction>
      </div>

      <div className="grid">
        {categories.length === 0 ? (
          <div className="grid min-h-[25rem] content-center justify-items-center gap-2 text-ink-muted">
            <span aria-hidden="true" className="text-3xl text-copper">
              ✦
            </span>
            <p className="m-0">Crea la primera sección para empezar tu carta.</p>
          </div>
        ) : null}

        {categories.map((category, categoryIndex) => {
          const products = category.products.filter(hasId);
          return (
            <section
              className="border-b border-line px-5 pt-6 pb-3 last:border-b-0 sm:px-8"
              data-testid="managed-category"
              key={category.id}
            >
              <header className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-display text-[11px] text-ink-muted tabular-nums">
                    {String(categoryIndex + 1).padStart(2, '0')}
                  </span>
                  <h3 className="m-0 font-display text-xl tracking-tight text-copper sm:text-2xl">
                    {category.name}
                  </h3>
                </div>
                <div
                  aria-label={`Acciones de ${category.name}`}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <OrderButtons
                    disabled={busy !== null}
                    first={categoryIndex === 0}
                    label={category.name}
                    last={categoryIndex === categories.length - 1}
                    move={(direction) => void moveCategory(categoryIndex, direction)}
                  />
                  <InlineAction
                    aria-label={`Editar sección ${category.name}`}
                    onClick={() => setCategoryEditor(category)}
                  >
                    Editar
                  </InlineAction>
                  <InlineAction
                    aria-label={`Eliminar sección ${category.name}`}
                    danger
                    onClick={() => void deleteCategory(category)}
                  >
                    Eliminar
                  </InlineAction>
                </div>
              </header>

              {products.length === 0 ? (
                <div className="border-t border-line py-4 text-xs text-ink-muted">
                  Esta sección aún no tiene productos.
                </div>
              ) : (
                products.map((product, productIndex) => (
                  <article
                    className={`grid grid-cols-[3.125rem_minmax(0,1fr)_auto] items-start gap-3 border-t border-line py-3 transition-opacity ${
                      product.isAvailable === false ? 'opacity-60' : ''
                    }`}
                    key={product.id}
                  >
                    {product.imagePath ? (
                      // The image comes from the authenticated local BFF endpoint.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="block size-12.5 rounded-lg bg-control object-cover"
                        src={`/api/owner/restaurants/${restaurant.id}/menu/products/${product.id}/image?v=${encodeURIComponent(menu.updatedAt)}`}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="grid size-12.5 place-items-center rounded-lg bg-control text-copper"
                      >
                        ✦
                      </span>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <strong data-testid="product-name">{product.name}</strong>
                        {product.isAvailable === false ? (
                          <em className="rounded-full bg-danger-wash px-1.5 py-0.5 text-[8px] font-black tracking-[0.08em] text-danger uppercase not-italic">
                            No disponible
                          </em>
                        ) : null}
                      </div>
                      {product.description ? (
                        <p className="my-1 text-xs/snug text-ink-soft">{product.description}</p>
                      ) : null}
                      <small className="text-[10px] text-ink-muted">
                        {product.variants.length} variantes · {product.extras.length} adicionales
                      </small>
                      <div className="mt-2">
                        <InlineAction
                          aria-label={`Acciones de ${product.name}`}
                          className="lg:hidden"
                          onClick={() => setOpenActions(product.id)}
                        >
                          Acciones ⌄
                        </InlineAction>
                        <ActionSheet
                          label={`Acciones de ${product.name}`}
                          onClose={() => setOpenActions(null)}
                          open={openActions === product.id}
                        >
                          <OrderButtons
                            disabled={busy !== null}
                            first={productIndex === 0}
                            label={product.name}
                            last={productIndex === products.length - 1}
                            move={(direction) => {
                              setOpenActions(null);
                              void moveProduct(category, productIndex, direction);
                            }}
                          />
                          <InlineAction
                            aria-label={`Editar ${product.name}`}
                            onClick={() => {
                              setOpenActions(null);
                              openProduct(category.id, product);
                            }}
                          >
                            Editar
                          </InlineAction>
                          <InlineAction
                            aria-label={
                              product.isAvailable === false
                                ? `Hacer disponible ${product.name}`
                                : `Marcar no disponible ${product.name}`
                            }
                            onClick={() => {
                              setOpenActions(null);
                              void toggleAvailability(product);
                            }}
                          >
                            {product.isAvailable === false
                              ? 'Hacer disponible'
                              : 'Marcar no disponible'}
                          </InlineAction>
                          <InlineAction
                            aria-label={`Eliminar ${product.name}`}
                            danger
                            onClick={() => {
                              setOpenActions(null);
                              void deleteProduct(product);
                            }}
                          >
                            Eliminar
                          </InlineAction>
                        </ActionSheet>
                      </div>
                    </div>

                    <span className="text-[13px] font-extrabold whitespace-nowrap text-ink tabular-nums">
                      S/ {product.basePrice}
                    </span>
                  </article>
                ))
              )}

              <button
                className="w-full border-t border-dashed border-line-strong py-3 text-left text-[11px] font-extrabold text-olive"
                onClick={() => openProduct(category.id)}
                type="button"
              >
                <span className="mr-2 inline-grid size-5.5 place-items-center rounded-full bg-olive-wash">
                  +
                </span>
                Añadir producto a {category.name}
              </button>
            </section>
          );
        })}
      </div>

      {categoryEditor ? (
        <ModalBackdrop>
          <form
            aria-label={categoryEditor === 'new' ? 'Nueva sección' : `Editar ${categoryEditor.name}`}
            className={modalPanel}
            onSubmit={saveCategory}
          >
            <span className="text-[11px] font-extrabold tracking-[0.14em] text-olive uppercase">
              Estructura de la carta
            </span>
            <h2 className="-mt-2 mb-0 font-display text-2xl tracking-[-0.03em] sm:text-3xl">
              {categoryEditor === 'new' ? 'Nueva sección' : 'Editar sección'}
            </h2>
            <Field label="Nombre">
              <input
                autoFocus
                className={fieldControl}
                defaultValue={categoryEditor === 'new' ? '' : categoryEditor.name}
                maxLength={120}
                name="name"
                required
              />
            </Field>
            <EditorFooter
              busy={busy !== null}
              close={() => setCategoryEditor(null)}
              label="Guardar sección"
            />
          </form>
        </ModalBackdrop>
      ) : null}

      {productDraft ? (
        <ModalBackdrop>
          <form
            aria-label={productDraft.product ? `Editar ${productDraft.product.name}` : 'Nuevo producto'}
            className={`${modalPanel} ${modalPanelWide}`}
            onSubmit={saveProduct}
          >
            <span className="text-[11px] font-extrabold tracking-[0.14em] text-olive uppercase">
              Ficha de producto
            </span>
            <h2 className="-mt-2 mb-0 font-display text-2xl tracking-[-0.03em] sm:text-3xl">
              {productDraft.product ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.56fr)]">
              <Field label="Nombre">
                <input
                  className={fieldControl}
                  maxLength={200}
                  onChange={(event) => updateDraft(setProductDraft, { name: event.target.value })}
                  required
                  value={productDraft.name}
                />
              </Field>
              <Field label="Sección">
                <select
                  className={fieldControl}
                  onChange={(event) =>
                    updateDraft(setProductDraft, { categoryId: event.target.value })
                  }
                  value={productDraft.categoryId}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className="sm:col-span-2" label="Descripción">
                <textarea
                  className={`${fieldControl} resize-y`}
                  maxLength={2000}
                  onChange={(event) =>
                    updateDraft(setProductDraft, { description: event.target.value })
                  }
                  rows={3}
                  value={productDraft.description}
                />
              </Field>
              <Field label="Precio base (S/)">
                <input
                  className={fieldControl}
                  min="0"
                  onChange={(event) =>
                    updateDraft(setProductDraft, { basePrice: event.target.value })
                  }
                  required
                  step="0.01"
                  type="number"
                  value={productDraft.basePrice}
                />
              </Field>
              <Field
                className="sm:col-span-2"
                hint="JPG, PNG o WebP · máximo 4 MB"
                label="Imagen opcional"
              >
                <input
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Imagen del producto"
                  className={`${fieldControl} py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-olive`}
                  onChange={(event) =>
                    updateDraft(setProductDraft, {
                      image: event.target.files?.[0] ?? null,
                      removeImage: false,
                    })
                  }
                  type="file"
                />
              </Field>
              {productDraft.product?.imagePath ? (
                <label className="flex items-center gap-2 text-xs text-ink-soft sm:col-span-2">
                  <input
                    checked={productDraft.removeImage}
                    className="size-4 accent-olive"
                    onChange={(event) =>
                      updateDraft(setProductDraft, { removeImage: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Quitar imagen actual
                </label>
              ) : null}
            </div>
            <OptionEditor
              kind="variants"
              label="Variantes"
              options={productDraft.variants}
              setDraft={setProductDraft}
            />
            <OptionEditor
              kind="extras"
              label="Adicionales"
              options={productDraft.extras}
              setDraft={setProductDraft}
            />
            <EditorFooter
              busy={busy !== null}
              close={() => setProductDraft(null)}
              label={productDraft.product ? 'Guardar producto' : 'Crear producto'}
            />
          </form>
        </ModalBackdrop>
      ) : null}
    </>
  );
}

function OptionEditor({
  kind,
  label,
  options,
  setDraft,
}: {
  kind: 'extras' | 'variants';
  label: string;
  options: OptionDraft[];
  setDraft: React.Dispatch<React.SetStateAction<ProductDraft | null>>;
}) {
  function change(index: number, patch: Partial<OptionDraft>) {
    setDraft((current) => current ? {
      ...current,
      [kind]: current[kind].map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option),
    } : null);
  }
  return (
    <fieldset className="grid gap-2 rounded-xl border border-line p-3.5">
      <legend className="px-1.5 font-display text-base font-bold text-copper">{label}</legend>
      {options.map((option, index) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.75rem] gap-2"
          key={`${kind}-${index}`}
        >
          <input
            aria-label={`${label} ${index + 1} nombre`}
            className={`${fieldControl} min-h-11 border-line-strong bg-paper`}
            maxLength={120}
            onChange={(event) => change(index, { name: event.target.value })}
            placeholder="Nombre"
            required
            value={option.name}
          />
          <input
            aria-label={`${label} ${index + 1} precio`}
            className={`${fieldControl} min-h-11 border-line-strong bg-paper`}
            min="0"
            onChange={(event) => change(index, { price: event.target.value })}
            placeholder="S/ 0.00"
            required
            step="0.01"
            type="number"
            value={option.price}
          />
          <button
            aria-label={`Quitar ${label.toLowerCase()} ${index + 1}`}
            className="min-h-11 rounded-lg bg-danger-wash text-lg text-danger"
            onClick={() =>
              setDraft((current) => current ? {
                ...current,
                [kind]: current[kind].filter((_, optionIndex) => optionIndex !== index),
              } : null)
            }
            type="button"
          >
            ×
          </button>
        </div>
      ))}
      <TextAction
        onClick={() =>
          setDraft((current) => current ? {
            ...current,
            [kind]: [...current[kind], { name: '', price: '' }],
          } : null)
        }
      >
        + Añadir {label.toLowerCase()}
      </TextAction>
    </fieldset>
  );
}

function OrderButtons({
  disabled,
  first,
  label,
  last,
  move,
}: {
  disabled: boolean;
  first: boolean;
  label: string;
  last: boolean;
  move: (direction: -1 | 1) => void;
}) {
  return (
    <span className="inline-flex gap-1">
      <InlineAction
        aria-label={`Subir ${label}`}
        disabled={disabled || first}
        onClick={() => move(-1)}
        title="Subir"
      >
        ↑
      </InlineAction>
      <InlineAction
        aria-label={`Bajar ${label}`}
        disabled={disabled || last}
        onClick={() => move(1)}
        title="Bajar"
      >
        ↓
      </InlineAction>
    </span>
  );
}

function EditorFooter({ busy, close, label }: { busy: boolean; close: () => void; label: string }) {
  return (
    <ModalFooter>
      <Button disabled={busy} onClick={close} tone="secondary">
        Cancelar
      </Button>
      <Button disabled={busy} type="submit">
        {busy ? 'Guardando…' : label}
      </Button>
    </ModalFooter>
  );
}

function hasId<T extends { id?: string }>(record: T): record is T & { id: string } {
  return typeof record.id === 'string';
}

function toOptionDraft(option: MenuOption): OptionDraft {
  return { name: option.name, price: option.price };
}

function updateDraft(
  setDraft: React.Dispatch<React.SetStateAction<ProductDraft | null>>,
  patch: Partial<ProductDraft>,
) {
  setDraft((current) => current ? { ...current, ...patch } : null);
}

function jsonRequest(method: 'PATCH' | 'POST' | 'PUT', body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method,
  };
}

function countProducts(menu: PublishedMenu): number {
  return menu.categories.reduce((total, category) => total + category.products.length, 0);
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (Array.isArray(body.message)) return body.message.join(' ');
  return body.message ?? 'No pudimos completar la operación. Vuelve a intentarlo.';
}
