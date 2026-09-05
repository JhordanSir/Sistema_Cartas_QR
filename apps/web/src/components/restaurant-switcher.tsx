'use client';

import type { ChangeEvent } from 'react';

import { fieldControl } from './field';

interface SwitchableRestaurant {
  id: string;
  name: string;
}

/**
 * Shown only when the account owns more than one restaurant. Repeated across the
 * profile, menu, QR and statistics screens, so it lives here.
 */
export function RestaurantSwitcher({
  onChange,
  restaurants,
  selectedId,
}: {
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  restaurants: SwitchableRestaurant[];
  selectedId: string | undefined;
}) {
  if (restaurants.length < 2) return null;
  return (
    <label className="grid w-full gap-1.5 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase lg:min-w-56">
      <span>Restaurante</span>
      <select className={fieldControl} onChange={onChange} value={selectedId}>
        {restaurants.map((restaurant) => (
          <option key={restaurant.id} value={restaurant.id}>
            {restaurant.name}
          </option>
        ))}
      </select>
    </label>
  );
}
