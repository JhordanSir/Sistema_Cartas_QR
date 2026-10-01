'use client';

import { useState, type FormEvent } from 'react';

import { focusFirstError, useFormFields } from '@/components/forms/use-form-fields';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { controlClasses, Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/surfaces';
import {
  DESCRIPTION_MAX_LENGTH,
  PRICED_ITEMS_MAX,
  pricedItemField,
  PRODUCT_NAME_MAX_LENGTH,
  SECTION_NAME_MAX_LENGTH,
  validatePricedItems,
  validateProductForm,
  validateSectionName,
  type CategoryLayout,
  type DraftCategory,
  type PricedItemValues,
  type PricedListKind,
} from '@/shared/menu';

import {
  newEditableItem,
  PricedItemsEditor,
  pricedItemInputId,
  type EditableItem,
} from './priced-items-editor';

/** What the editor answers after trying to save a form. */
export type SaveResult = { ok: true } | { ok: false; fields?: Record<string, string>; message?: string };

const LAYOUTS: { value: CategoryLayout; label: string; description: string }[] = [
  { description: 'Filas con nombre, descripción y precio.', label: 'Lista', value: 'LIST' },
  { description: 'Tarjetas con la foto arriba.', label: 'Tarjetas', value: 'CARDS' },
];

const SECTION_FIELD_IDS = { name: 'section-name' } as const;

export function SectionForm({
  initial,
  onCancel,
  onSave,
  submitLabel,
}: {
  initial: { name: string; layout: CategoryLayout };
  onCancel: () => void;
  onSave: (values: { name: string; layout: CategoryLayout }) => Promise<SaveResult>;
  submitLabel: string;
}) {
  const form = useFormFields({ name: initial.name }, ({ name }) => {
    const error = validateSectionName(name);
    return error ? { name: error } : {};
  });
  const [layout, setLayout] = useState(initial.layout);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    if (focusFirstError(form.validateAll(), SECTION_FIELD_IDS)) return;
    setPending(true);
    const result = await onSave({ layout, name: form.values.name });
    if (result.ok) return;
    setPending(false);
    if (result.fields) {
      form.setServerErrors(result.fields);
      focusFirstError(result.fields, SECTION_FIELD_IDS);
    } else {
      setFormError(result.message ?? null);
    }
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
      <Field error={form.errors.name} id={SECTION_FIELD_IDS.name} label="Nombre de la sección">
        {(control) => (
          <input
            {...control}
            className={controlClasses}
            maxLength={SECTION_NAME_MAX_LENGTH}
            name="name"
            onChange={(event) => form.setValue('name', event.target.value)}
            placeholder="Por ejemplo, Entradas"
            value={form.values.name}
          />
        )}
      </Field>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold text-ink-soft">Diseño en la carta</legend>
        {LAYOUTS.map((option) => (
          <label
            className={cn(
              'flex min-h-11 cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5',
              layout === option.value ? 'border-wine bg-wine-wash' : 'border-control-border bg-raised',
            )}
            key={option.value}
          >
            <input
              checked={layout === option.value}
              className="mt-1 h-4 w-4 accent-wine"
              name="layout"
              onChange={() => setLayout(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="grid gap-0.5">
              <span className="text-[15px] font-semibold text-ink">{option.label}</span>
              <span className="text-[13px] text-ink-soft">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} type="submit">
          {pending ? 'Guardando…' : submitLabel}
        </Button>
        <Button disabled={pending} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export type ProductFormValues = {
  name: string;
  description: string;
  basePrice: string;
  categoryId: string;
  isAvailable: boolean;
  variants: PricedItemValues[];
  extras: PricedItemValues[];
};

const PRODUCT_FIELD_IDS = {
  name: 'product-name',
  description: 'product-description',
  basePrice: 'product-price',
} as const;

type Lists = Record<PricedListKind, EditableItem[]>;
const KINDS: readonly PricedListKind[] = ['variants', 'extras'];

/** Index-keyed errors ("variants.1.name") → row-keyed ("fila-7:name"), for the rows as they are now. */
function rowErrorsFrom(lists: Lists, indexErrors: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const kind of KINDS) {
    const tooMany = indexErrors[kind];
    if (tooMany) errors[kind] = tooMany;
    lists[kind].forEach((item, index) => {
      for (const field of ['name', 'price'] as const) {
        const message = indexErrors[pricedItemField(kind, index, field)];
        if (message) errors[`${item.key}:${field}`] = message;
      }
    });
  }
  return errors;
}

/** Keeps only the errors that are still true; a corrected field loses its error. */
function stillInvalid(previous: Record<string, string>, lists: Lists): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [errorKey, message] of Object.entries(previous)) {
    if (errorKey === 'variants' || errorKey === 'extras') {
      if (lists[errorKey].length > PRICED_ITEMS_MAX) errors[errorKey] = message;
      continue;
    }
    const [rowKey, field] = errorKey.split(':') as [string, 'name' | 'price'];
    for (const kind of KINDS) {
      const row = lists[kind].find((item) => item.key === rowKey);
      if (!row) continue;
      const current = validatePricedItems(kind, [row])[pricedItemField(kind, 0, field)];
      if (current) errors[errorKey] = current;
    }
  }
  return errors;
}

/** Focuses the first field with an error, in screen order; false when there is none. */
function focusFirstProductError(
  textErrors: Record<string, string | undefined>,
  lists: Lists,
  indexErrors: Record<string, string>,
): boolean {
  const order: [boolean, string][] = [
    ...(Object.keys(PRODUCT_FIELD_IDS) as (keyof typeof PRODUCT_FIELD_IDS)[]).map(
      (field): [boolean, string] => [Boolean(textErrors[field]), PRODUCT_FIELD_IDS[field]],
    ),
    ...KINDS.flatMap((kind) =>
      lists[kind].flatMap((_, index) =>
        (['name', 'price'] as const).map((field): [boolean, string] => [
          Boolean(indexErrors[pricedItemField(kind, index, field)]),
          pricedItemInputId(kind, index, field),
        ]),
      ),
    ),
  ];
  const first = order.find(([hasError]) => hasError);
  if (!first) return false;
  document.getElementById(first[1])?.focus();
  return true;
}

export function ProductForm({
  categories,
  initial,
  onCancel,
  onDelete,
  onSave,
  submitLabel,
}: {
  categories: readonly DraftCategory[];
  initial: ProductFormValues;
  onCancel: () => void;
  /** Only when editing an existing product. */
  onDelete?: () => void;
  onSave: (values: ProductFormValues) => Promise<SaveResult>;
  submitLabel: string;
}) {
  const form = useFormFields(
    { basePrice: initial.basePrice, description: initial.description, name: initial.name },
    validateProductForm,
  );
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [isAvailable, setIsAvailable] = useState(initial.isAvailable);
  const [lists, setLists] = useState<Lists>(() => ({
    extras: initial.extras.map((item) => newEditableItem(item.name, item.price)),
    variants: initial.variants.map((item) => newEditableItem(item.name, item.price)),
  }));
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function changeList(kind: PricedListKind, items: EditableItem[]): void {
    const next = { ...lists, [kind]: items };
    setLists(next);
    setRowErrors((previous) => stillInvalid(previous, next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    const textErrors = form.validateAll();
    const listErrors = {
      ...validatePricedItems('variants', lists.variants),
      ...validatePricedItems('extras', lists.extras),
    };
    setRowErrors(rowErrorsFrom(lists, listErrors));
    if (focusFirstProductError(textErrors, lists, listErrors)) return;
    if (listErrors.variants || listErrors.extras) return;

    setPending(true);
    const result = await onSave({
      ...form.values,
      categoryId,
      extras: lists.extras.map(({ name, price }) => ({ name, price })),
      isAvailable,
      variants: lists.variants.map(({ name, price }) => ({ name, price })),
    });
    if (result.ok) return;
    setPending(false);
    if (!result.fields) {
      setFormError(result.message ?? null);
      return;
    }
    const { basePrice, description, name, ...listFields } = result.fields;
    const textFields: Record<string, string> = {};
    for (const [field, message] of Object.entries({ basePrice, description, name })) {
      if (message !== undefined) textFields[field] = message;
    }
    form.setServerErrors(textFields);
    setRowErrors(rowErrorsFrom(lists, listFields));
    focusFirstProductError(textFields, lists, listFields);
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
      <Field error={form.errors.name} id={PRODUCT_FIELD_IDS.name} label="Nombre del producto">
        {(control) => (
          <input
            {...control}
            className={controlClasses}
            maxLength={PRODUCT_NAME_MAX_LENGTH}
            name="name"
            onChange={(event) => form.setValue('name', event.target.value)}
            value={form.values.name}
          />
        )}
      </Field>
      <Field
        error={form.errors.description}
        hint="Opcional. Ingredientes, porción o lo que ayude a elegir."
        id={PRODUCT_FIELD_IDS.description}
        label="Descripción"
      >
        {(control) => (
          <textarea
            {...control}
            className={cn(controlClasses, 'min-h-24 resize-y')}
            maxLength={DESCRIPTION_MAX_LENGTH}
            name="description"
            onChange={(event) => form.setValue('description', event.target.value)}
            rows={3}
            value={form.values.description}
          />
        )}
      </Field>
      <Field
        error={form.errors.basePrice}
        hint="En soles, con punto para los céntimos: 18.50."
        id={PRODUCT_FIELD_IDS.basePrice}
        label="Precio"
      >
        {(control) => (
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[15px] font-semibold text-ink-soft">
              S/
            </span>
            <input
              {...control}
              className={cn(controlClasses, 'max-w-40 tabular-nums')}
              inputMode="decimal"
              name="basePrice"
              onChange={(event) => form.setValue('basePrice', event.target.value)}
              value={form.values.basePrice}
            />
          </div>
        )}
      </Field>
      <Field id="product-category" label="Sección">
        {(control) => (
          <select
            {...control}
            className={controlClasses}
            name="categoryId"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          checked={isAvailable}
          className="mt-1 h-4 w-4 accent-wine"
          name="isAvailable"
          onChange={(event) => setIsAvailable(event.target.checked)}
          type="checkbox"
        />
        <span className="grid gap-0.5">
          <span className="text-[15px] font-semibold text-ink">Disponible</span>
          <span className="text-[13px] text-ink-soft">
            Si lo desmarcas, no aparece en tu carta pública, pero se queda aquí.
          </span>
        </span>
      </label>
      <PricedItemsEditor
        disabled={pending}
        errors={rowErrors}
        items={lists.variants}
        kind="variants"
        onChange={(items) => changeList('variants', items)}
      />
      <PricedItemsEditor
        disabled={pending}
        errors={rowErrors}
        items={lists.extras}
        kind="extras"
        onChange={(items) => changeList('extras', items)}
      />
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} type="submit">
          {pending ? 'Guardando…' : submitLabel}
        </Button>
        <Button disabled={pending} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        {onDelete ? (
          <Button className="sm:ml-auto" disabled={pending} onClick={onDelete} variant="danger">
            Eliminar producto
          </Button>
        ) : null}
      </div>
    </form>
  );
}
