import React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'brand' | 'outlined' | 'danger';

interface DecidixButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  compact?: boolean;
  expand?: boolean;
  fullWidth?: boolean;
  pill?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * DecidixButton: Modern Enterprise SaaS button component.
 * - Standard 8-10px rounded corners (or pill if requested)
 * - Crisp borders, ultra-subtle shadows, smooth hover & active scale micro-interactions.
 */
export const DecidixButton: React.FC<DecidixButtonProps> = ({
  variant = 'primary',
  compact = false,
  expand = false,
  fullWidth = false,
  pill = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const isFull = expand || fullWidth;

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold select-none transition-all duration-150 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue/20',
        pill ? 'rounded-full' : 'rounded-lg',
        compact ? 'h-9 px-3.5 text-xs' : 'h-10 px-4 text-sm',
        isFull ? 'w-full' : 'w-auto',
        variant === 'primary' && 'bg-blue text-white shadow-xs hover:bg-blue-hover active:scale-[0.98]',
        variant === 'brand' && 'bg-blue text-white shadow-xs hover:bg-blue-hover active:scale-[0.98]',
        variant === 'outlined' && 'bg-white text-navy border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-2xs active:scale-[0.98]',
        variant === 'danger' && 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-[0.98]',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent pointer-events-none active:scale-100',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
};
