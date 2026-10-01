'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { controlClasses, Field } from '@/components/ui/field';
import {
  moveItem,
  PRICED_ITEM_NAME_MAX_LENGTH,
  PRICED_ITEMS_MAX,
  pricedItemField,
  type MoveDirection,
  type PricedListKind,
} from '@/shared/menu';

/** A row being edited; `key` only keeps React's identity while rows move. */
export type EditableItem = { key: string; name: string; price: string };

let lastKey = 0;
export function newEditableItem(name = '', price = ''): EditableItem {
  lastKey += 1;
  return { key: `fila-${lastKey}`, name, price };
}

/** Element id of one input of one row: "variants-0-price". */
export function pricedItemInputId(kind: PricedListKind, index: number, field: 'name' | 'price'): string {
  return pricedItemField(kind, index, field).replaceAll('.', '-');
}

const COPY = {
  extras: {
    add: 'Agregar adicional',
    empty: 'Sin adicionales.',
    hint: 'Extras opcionales con su propio precio, como «Choclo» o «Doble porción».',
    item: 'adicional',
    legend: 'Adicionales',
    of: 'del adicional',
  },
  variants: {
    add: 'Agregar opción',
    empty: 'Sin opciones: se vende con el precio de arriba.',
    hint: 'Presentaciones o tamaños con su propio precio, como «Personal» o «Para compartir».',
    item: 'opción',
    legend: 'Opciones',
    of: 'de la opción',
  },
} as const;

/** Editable list of variants or extras: add, remove and order rows. */
export function PricedItemsEditor({
  disabled,
  errors,
  items,
  kind,
  onChange,
}: {
  disabled: boolean;
  /** By row key ("fila-3:name"), so they follow their row; a list too long, by kind. */
  errors: Record<string, string>;
  items: readonly EditableItem[];
  kind: PricedListKind;
  onChange: (items: EditableItem[]) => void;
}) {
  const copy = COPY[kind];

  function update(index: number, field: 'name' | 'price', value: string): void {
    onChange(items.map((item, position) => (position === index ? { ...item, [field]: value } : item)));
  }

  function move(key: string, direction: MoveDirection): void {
    const reordered = moveItem(items.map((item) => ({ ...item, id: item.key })), key, direction);
    if (reordered) onChange(reordered.map(({ key: itemKey, name, price }) => ({ key: itemKey, name, price })));
  }

  return (
    <fieldset className="m-0 grid gap-3 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-semibold text-ink-soft">{copy.legend}</legend>
      <p className="m-0 -mt-1 text-[13px] text-ink-muted">{copy.hint}</p>
      {errors[kind] ? (
        <p className="m-0 text-[13px] font-medium text-danger" role="alert">
          {errors[kind]}
        </p>
      ) : null}
      {items.length === 0 ? <p className="m-0 text-sm text-ink-muted">{copy.empty}</p> : null}
      <ol className="m-0 grid list-none gap-3 p-0">
        {items.map((item, index) => {
          const number = index + 1;
          return (
            <li className="grid gap-3 rounded-control border border-line bg-paper p-3" key={item.key}>
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <Field
                  error={errors[`${item.key}:name`]}
                  id={pricedItemInputId(kind, index, 'name')}
                  label={
                    <>
                      Nombre<span className="sr-only"> {copy.of} {number}</span>
                    </>
                  }
                >
                  {(control) => (
                    <input
                      {...control}
                      className={controlClasses}
                      disabled={disabled}
                      maxLength={PRICED_ITEM_NAME_MAX_LENGTH}
                      onChange={(event) => update(index, 'name', event.target.value)}
                      value={item.name}
                    />
                  )}
                </Field>
                <Field
                  error={errors[`${item.key}:price`]}
                  id={pricedItemInputId(kind, index, 'price')}
                  label={
                    <>
                      Precio<span className="sr-only"> {copy.of} {number}, en soles</span>
                    </>
                  }
                >
                  {(control) => (
                    <input
                      {...control}
                      className={cn(controlClasses, 'tabular-nums')}
                      disabled={disabled}
                      inputMode="decimal"
                      onChange={(event) => update(index, 'price', event.target.value)}
                      placeholder="0.00"
                      value={item.price}
                    />
                  )}
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  aria-label={`Subir ${copy.item} ${number}`}
                  className="min-h-11 px-3 text-sm"
                  disabled={disabled || index === 0}
                  onClick={() => move(item.key, 'up')}
                  variant="secondary"
                >
                  Subir
                </Button>
                <Button
                  aria-label={`Bajar ${copy.item} ${number}`}
                  className="min-h-11 px-3 text-sm"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(item.key, 'down')}
                  variant="secondary"
                >
                  Bajar
                </Button>
                <Button
                  aria-label={`Quitar ${copy.item} ${number}`}
                  className="min-h-11 px-3 text-sm"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((_, position) => position !== index))}
                  variant="danger"
                >
                  Quitar
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <Button
        className="justify-self-start"
        disabled={disabled || items.length >= PRICED_ITEMS_MAX}
        onClick={() => onChange([...items, newEditableItem()])}
        variant="secondary"
      >
        {copy.add}
      </Button>
    </fieldset>
  );
}
