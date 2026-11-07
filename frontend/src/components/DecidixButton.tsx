import React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'brand' | 'outlined' | 'danger';

interface DecidixButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  compact?: boolean;
  expand?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * DecidixButton: Authentic 52px pill button (or compact).
 * Follows Figma guidelines:
 * - 'primary': Solid Deep Navy with white text & soft floating shadow.
 * - 'brand': Electric Blue with white text.
 * - 'outlined': White with hairline border and navy text.
 */
export const DecidixButton: React.FC<DecidixButtonProps> = ({
  variant = 'primary',
  compact = false,
  expand = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold select-none rounded-pill transition-all duration-200',
        compact ? 'h-10 px-4 text-xs' : 'h-[52px] px-6 text-sm',
        expand ? 'w-full' : 'w-auto',
        variant === 'primary' && 'bg-navy text-white shadow-decidix-pill hover:bg-[#0c2650] active:scale-[0.99]',
        variant === 'brand' && 'bg-blue text-white shadow-md hover:bg-blue-700 active:scale-[0.99]',
        variant === 'outlined' && 'bg-white text-navy border border-hairline hover:bg-well active:scale-[0.99]',
        variant === 'danger' && 'bg-rose-50 text-danger border border-rose-200 hover:bg-rose-100',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent pointer-events-none',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};
