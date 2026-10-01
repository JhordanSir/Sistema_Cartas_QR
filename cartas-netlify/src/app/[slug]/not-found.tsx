import type { Metadata } from 'next';

export const metadata: Metadata = { title: { absolute: 'Carta no disponible' } };

/** A slug that does not exist and a paused restaurant look the same to a diner (§E8). */
export default function MenuNotFound() {
  return (
    <main className="grid min-h-dvh content-center justify-items-center gap-3 bg-paper px-4 text-center font-sans text-ink">
      <h1 className="m-0 text-2xl font-bold">Esta carta no está disponible.</h1>
      <p className="m-0 max-w-sm text-[15px] text-ink-soft">
        Revisa la dirección o pregunta en el restaurante por su carta.
      </p>
    </main>
  );
}
