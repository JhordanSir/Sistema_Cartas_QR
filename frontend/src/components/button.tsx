import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

type ButtonTone = 'danger' | 'primary' | 'quiet' | 'secondary';

const TONES: Record<ButtonTone, string> = {
  danger: 'bg-danger text-white hover:bg-danger-hover',
  primary: 'bg-olive text-white hover:bg-olive-hover',
  quiet: 'border border-line-strong text-ink hover:border-copper hover:bg-paper',
  secondary: 'bg-control text-ink hover:bg-control-hover',
};

// min-h-11 is the 44px touch target every interactive control must clear.
const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 ' +
  'text-sm/none font-bold no-underline transition-colors duration-150 ease-soft ' +
  'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45';

interface CommonProps {
  children: ReactNode;
  className?: string;
  full?: boolean;
  tone?: ButtonTone;
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

export function Button({
  children,
  className,
  full = false,
  tone = 'primary',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button className={cn(BASE, TONES[tone], full && 'w-full', className)} type={type} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps & {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'>;

export function ButtonLink({
  children,
  className,
  full = false,
  href,
  tone = 'primary',
  ...rest
}: ButtonLinkProps) {
  const classes = cn(BASE, TONES[tone], full && 'w-full', className);
  if (href.startsWith('http')) {
    return (
      <a className={classes} href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link className={classes} href={href} {...rest}>
      {children}
    </Link>
  );
}

/**
 * Compact action used inside dense rows (menu products, category headers). It is
 * still a real touch target: the visible box is small but the tap area is 44px.
 */
export function InlineAction({
  children,
  className,
  danger = false,
  type = 'button',
  ...rest
}: { danger?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    className?: string;
  }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-md bg-control px-2.5',
        'text-[11px] font-extrabold transition-colors duration-150 ease-soft',
        'hover:bg-control-hover disabled:cursor-default disabled:opacity-35',
        danger ? 'text-danger' : 'text-olive',
        className,
      )}
      type={type}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Borderless text action, e.g. "+ Nueva sección". */
export function TextAction({
  children,
  className,
  type = 'button',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & { className?: string }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center text-[11px] font-extrabold text-olive',
        'hover:text-olive-hover',
        className,
      )}
      type={type}
      {...rest}
    >
      {children}
    </button>
  );
}
