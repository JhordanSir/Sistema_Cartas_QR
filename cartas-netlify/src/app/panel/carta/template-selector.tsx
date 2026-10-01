'use client';

import { useState } from 'react';

import { menuFontFamily } from '@/app/menu-fonts';
import { cn } from '@/components/ui/cn';
import { StatusPill } from '@/components/ui/surfaces';
import type { MenuAppearance } from '@/shared/menu';
import { MENU_TEMPLATES, type MenuTemplate } from '@/shared/menu-style';

/**
 * The four templates of §E7 with a sample of each: background, text color
 * and the restaurant's name in that template's font. Choosing one saves it at
 * once; diners see it after the next publication. The panel itself never
 * changes its look.
 */
export function TemplateSelector({
  appearance,
  disabled,
  onChoose,
  restaurantName,
}: {
  appearance: MenuAppearance;
  disabled: boolean;
  /** Resolves once the server answered; on failure the previous choice comes back. */
  onChoose: (template: MenuTemplate) => Promise<boolean>;
  restaurantName: string;
}) {
  // The choice shows at once, before the server confirms it.
  const [optimistic, setOptimistic] = useState<MenuTemplate | null>(null);
  const current = optimistic ?? appearance.template;

  async function choose(template: MenuTemplate): Promise<void> {
    setOptimistic(template);
    await onChoose(template);
    setOptimistic(null);
  }

  return (
    <section aria-labelledby="titulo-plantilla" className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="m-0 font-display text-2xl font-semibold" id="titulo-plantilla">
          Plantilla
        </h2>
        <p className="m-0 text-[15px] text-ink-soft">
          Elige cómo se ve tu carta pública. El cambio llega a tus clientes cuando publicas.
        </p>
      </div>
      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">Plantilla de la carta</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MENU_TEMPLATES.map((option) => {
            const style = option.style ?? appearance.detectedStyle;
            const selected = option.value === current;
            return (
              <label
                className={cn(
                  'grid cursor-pointer content-start gap-3 rounded-card border bg-raised p-3',
                  selected ? 'border-wine ring-2 ring-wine' : 'border-line hover:border-control-border',
                  disabled && 'cursor-not-allowed opacity-70',
                )}
                key={option.value}
              >
                <span
                  aria-hidden="true"
                  className="grid min-h-20 place-items-center rounded-control px-3 py-4 text-center text-lg leading-snug font-semibold"
                  style={{
                    backgroundColor: style.backgroundColor,
                    color: style.textColor,
                    fontFamily: menuFontFamily(style.fontFamily),
                  }}
                >
                  {restaurantName}
                </span>
                <span className="flex items-start gap-2">
                  <input
                    checked={selected}
                    className="mt-1 h-4 w-4 shrink-0 accent-wine"
                    disabled={disabled || optimistic !== null}
                    name="template"
                    onChange={() => void choose(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span className="grid gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                      {option.label}
                      {selected ? <StatusPill tone="success">Elegida</StatusPill> : null}
                    </span>
                    <span className="text-[13px] text-ink-soft">{option.description}</span>
                    <span className="text-[13px] text-ink-muted">Letra: {style.fontFamily}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
