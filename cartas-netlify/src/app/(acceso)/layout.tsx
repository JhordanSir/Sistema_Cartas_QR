import { Brand } from '@/components/brand';

import { shellFontClassName } from '../shell-fonts';

/** Sign-in and sign-up: one centred sheet of paper under the brand. */
export default function AccessLayout({ children }: LayoutProps<'/'>) {
  return (
    <div
      className={`${shellFontClassName} grid min-h-dvh content-start justify-items-center gap-8 bg-paper px-4 py-10 font-sans text-ink sm:py-16`}
    >
      <header>
        <Brand />
      </header>
      <main className="w-full max-w-md">{children}</main>
    </div>
  );
}
