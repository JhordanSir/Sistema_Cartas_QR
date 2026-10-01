import Link from 'next/link';
import type { ComponentProps } from 'react';

import { cn } from './cn';

type ButtonVariant = 'danger' | 'primary' | 'secondary';

const VARIANTS: Record<ButtonVariant, string> = {
  danger: 'border border-danger bg-raised text-danger hover:bg-danger-wash',
  primary: 'bg-wine text-white hover:bg-wine-hover',
  secondary: 'border border-control-border bg-raised text-ink hover:bg-control',
};

export function buttonClasses(variant: ButtonVariant = 'primary', fullWidth = false): string {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold',
    'no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    fullWidth && 'w-full',
  );
}

export function Button({
  className,
  fullWidth,
  type = 'button',
  variant,
  ...props
}: ComponentProps<'button'> & { fullWidth?: boolean; variant?: ButtonVariant }) {
  return (
    <button className={cn(buttonClasses(variant, fullWidth), className)} type={type} {...props} />
  );
}

export function ButtonLink({
  className,
  fullWidth,
  variant,
  ...props
}: ComponentProps<typeof Link> & { fullWidth?: boolean; variant?: ButtonVariant }) {
  return <Link className={cn(buttonClasses(variant, fullWidth), className)} {...props} />;
}
