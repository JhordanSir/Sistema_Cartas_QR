'use client';

import { type FormEvent, useState } from 'react';

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
      setNotice(editing ? 'Sección actualizada en la carta pública.' : 'Sección creada y publicada.');
    }
  }

  async function deleteCategory(category: ManagedCategory) {
    if (!window.confirm(`¿Eliminar “${category.name}” y todos sus productos permanentemente?`)) {
      return;
    }
    const nextMenu = await mutate(`/categories/${category.id}`, { method: 'DELETE' });
    if (nextMenu) setNotice('Sección y productos eliminados permanentemente.');
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const ordered = categories.map((category) => category.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
    const nextMenu = await mutate('/categories-order', jsonRequest('PUT', { orderedIds: ordered }));
    if (nextMenu) setNotice('Orden de secciones actualizado.');
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
      setNotice(productDraft.product ? 'Producto actualizado en la carta pública.' : 'Producto creado y publicado.');
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
        ? 'Producto disponible y visible en la carta pública.'
        : 'Producto marcado como no disponible y oculto de la carta pública.');
    }
  }

  async function deleteProduct(product: ManagedProduct) {
    if (!window.confirm(`¿Eliminar “${product.name}” permanentemente?`)) return;
    const nextMenu = await mutate(`/products/${product.id}`, { method: 'DELETE' });
    if (nextMenu) setNotice('Producto eliminado permanentemente.');
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
    if (nextMenu) setNotice('Orden de productos actualizado.');
  }

  return (
    <>
      <div className="menu-result-toolbar">
        <span>{categories.length} secciones · {countProducts(menu)} productos</span>
        <button className="text-action" onClick={() => setCategoryEditor('new')} type="button">
          + Nueva sección
        </button>
      </div>
      <div className="owner-menu-result">
        {categories.length === 0 ? (
          <div className="menu-result-empty">
            <span aria-hidden="true">✦</span>
            <p>Crea la primera sección para empezar tu carta.</p>
          </div>
        ) : null}
        {categories.map((category, categoryIndex) => {
          const products = category.products.filter(hasId);
          return (
            <section className="managed-category" key={category.id}>
              <header className="managed-category-header">
                <div>
                  <span className="category-folio">{String(categoryIndex + 1).padStart(2, '0')}</span>
                  <h3>{category.name}</h3>
                </div>
                <div className="row-actions" aria-label={`Acciones de ${category.name}`}>
                  <OrderButtons
                    disabled={busy !== null}
                    first={categoryIndex === 0}
                    label={category.name}
                    last={categoryIndex === categories.length - 1}
                    move={(direction) => void moveCategory(categoryIndex, direction)}
                  />
                  <button aria-label={`Editar sección ${category.name}`} onClick={() => setCategoryEditor(category)} type="button">Editar</button>
                  <button aria-label={`Eliminar sección ${category.name}`} className="danger-action" onClick={() => void deleteCategory(category)} type="button">Eliminar</button>
                </div>
              </header>
              {products.length === 0 ? (
                <div className="category-empty">Esta sección aún no tiene productos.</div>
              ) : products.map((product, productIndex) => (
                <article className={product.isAvailable === false ? 'is-unavailable' : ''} key={product.id}>
                  {product.imagePath ? (
                    // The image comes from the authenticated local BFF endpoint.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="product-thumbnail"
                      src={`/api/owner/restaurants/${restaurant.id}/menu/products/${product.id}/image?v=${encodeURIComponent(menu.updatedAt)}`}
                    />
                  ) : <span className="product-thumbnail product-thumbnail-empty" aria-hidden="true">✦</span>}
                  <div className="product-copy">
                    <div className="product-title-line">
                      <strong>{product.name}</strong>
                      {product.isAvailable === false ? <em>No disponible</em> : null}
                    </div>
                    {product.description ? <p>{product.description}</p> : null}
                    <small>{product.variants.length} variantes · {product.extras.length} adicionales</small>
                  </div>
                  <span>S/ {product.basePrice}</span>
                  <div className="product-actions">
                    <OrderButtons
                      disabled={busy !== null}
                      first={productIndex === 0}
                      label={product.name}
                      last={productIndex === products.length - 1}
                      move={(direction) => void moveProduct(category, productIndex, direction)}
                    />
                    <button aria-label={`Editar ${product.name}`} onClick={() => openProduct(category.id, product)} type="button">Editar</button>
                    <button aria-label={product.isAvailable === false ? `Hacer disponible ${product.name}` : `Marcar no disponible ${product.name}`} onClick={() => void toggleAvailability(product)} type="button">
                      {product.isAvailable === false ? 'Hacer disponible' : 'Marcar no disponible'}
                    </button>
                    <button aria-label={`Eliminar ${product.name}`} className="danger-action" onClick={() => void deleteProduct(product)} type="button">Eliminar</button>
                  </div>
                </article>
              ))}
              <button className="add-product-row" onClick={() => openProduct(category.id)} type="button">
                <span>+</span> Añadir producto a {category.name}
              </button>
            </section>
          );
        })}
      </div>

      {categoryEditor ? (
        <div className="edit-product-backdrop" role="presentation">
          <form aria-label={categoryEditor === 'new' ? 'Nueva sección' : `Editar ${categoryEditor.name}`} className="edit-product-modal compact-modal" onSubmit={saveCategory}>
            <span className="kicker">Estructura de la carta</span>
            <h2>{categoryEditor === 'new' ? 'Nueva sección' : 'Editar sección'}</h2>
            <label className="field">
              <span>Nombre</span>
              <input defaultValue={categoryEditor === 'new' ? '' : categoryEditor.name} maxLength={120} name="name" required autoFocus />
            </label>
            <ModalFooter busy={busy !== null} close={() => setCategoryEditor(null)} label="Guardar sección" />
          </form>
        </div>
      ) : null}

      {productDraft ? (
        <div className="edit-product-backdrop" role="presentation">
          <form aria-label={productDraft.product ? `Editar ${productDraft.product.name}` : 'Nuevo producto'} className="edit-product-modal product-editor-modal" onSubmit={saveProduct}>
            <span className="kicker">Ficha de producto</span>
            <h2>{productDraft.product ? 'Editar producto' : 'Nuevo producto'}</h2>
            <div className="product-form-grid">
              <label className="field"><span>Nombre</span><input maxLength={200} onChange={(event) => updateDraft(setProductDraft, { name: event.target.value })} required value={productDraft.name} /></label>
              <label className="field"><span>Sección</span><select onChange={(event) => updateDraft(setProductDraft, { categoryId: event.target.value })} value={productDraft.categoryId}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="field product-description-field"><span>Descripción</span><textarea maxLength={2000} onChange={(event) => updateDraft(setProductDraft, { description: event.target.value })} rows={3} value={productDraft.description} /></label>
              <label className="field"><span>Precio base (S/)</span><input min="0" onChange={(event) => updateDraft(setProductDraft, { basePrice: event.target.value })} required step="0.01" type="number" value={productDraft.basePrice} /></label>
              <label className="field product-image-field"><span>Imagen opcional</span><input accept="image/jpeg,image/png,image/webp" aria-label="Imagen del producto" onChange={(event) => updateDraft(setProductDraft, { image: event.target.files?.[0] ?? null, removeImage: false })} type="file" /><small>JPG, PNG o WebP · máximo 4 MB</small></label>
              {productDraft.product?.imagePath ? <label className="remove-image-check"><input checked={productDraft.removeImage} onChange={(event) => updateDraft(setProductDraft, { removeImage: event.target.checked })} type="checkbox" /> Quitar imagen actual</label> : null}
            </div>
            <OptionEditor kind="variants" label="Variantes" options={productDraft.variants} setDraft={setProductDraft} />
            <OptionEditor kind="extras" label="Adicionales" options={productDraft.extras} setDraft={setProductDraft} />
            <ModalFooter busy={busy !== null} close={() => setProductDraft(null)} label={productDraft.product ? 'Guardar producto' : 'Crear producto'} />
          </form>
        </div>
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
    <fieldset className="option-editor">
      <legend>{label}</legend>
      {options.map((option, index) => (
        <div className="option-row" key={`${kind}-${index}`}>
          <input aria-label={`${label} ${index + 1} nombre`} maxLength={120} onChange={(event) => change(index, { name: event.target.value })} placeholder="Nombre" required value={option.name} />
          <input aria-label={`${label} ${index + 1} precio`} min="0" onChange={(event) => change(index, { price: event.target.value })} placeholder="S/ 0.00" required step="0.01" type="number" value={option.price} />
          <button aria-label={`Quitar ${label.toLowerCase()} ${index + 1}`} onClick={() => setDraft((current) => current ? { ...current, [kind]: current[kind].filter((_, optionIndex) => optionIndex !== index) } : null)} type="button">×</button>
        </div>
      ))}
      <button className="text-action" onClick={() => setDraft((current) => current ? { ...current, [kind]: [...current[kind], { name: '', price: '' }] } : null)} type="button">+ Añadir {label.toLowerCase()}</button>
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
    <span className="order-buttons">
      <button aria-label={`Subir ${label}`} disabled={disabled || first} onClick={() => move(-1)} title="Subir" type="button">↑</button>
      <button aria-label={`Bajar ${label}`} disabled={disabled || last} onClick={() => move(1)} title="Bajar" type="button">↓</button>
    </span>
  );
}

function ModalFooter({ busy, close, label }: { busy: boolean; close: () => void; label: string }) {
  return (
    <footer>
      <button className="button button-secondary" disabled={busy} onClick={close} type="button">Cancelar</button>
      <button className="button button-primary" disabled={busy} type="submit">{busy ? 'Guardando…' : label}</button>
    </footer>
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
