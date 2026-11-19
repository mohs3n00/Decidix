import React from 'react';
import clsx from 'clsx';

export type CardVariant = 'card' | 'row' | 'well';

interface DecidixCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
}

/**
 * DecidixCard: Crisp Modern SaaS container component.
 * - 'card': 16px (rounded-2xl) border-radius, crisp subtle border, ultra-subtle elevation.
 * - 'row': 12px (rounded-xl) border-radius for dense KPI tiles and rows.
 * - 'well': 12px (rounded-xl) border-radius with soft off-white canvas.
 */
export const DecidixCard: React.FC<DecidixCardProps> = ({
  children,
  variant = 'card',
  className,
  onClick,
  style,
  ...props
}) => {
  const isClickable = !!onClick;

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={clsx(
        'transition-all duration-150 text-navy',
        variant === 'card' && 'bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 md:p-6',
        variant === 'row' && 'bg-white border border-slate-200/80 rounded-xl shadow-xs p-4',
        variant === 'well' && 'bg-[#F8FAFC] border border-slate-200/70 rounded-xl p-4',
        isClickable && 'cursor-pointer hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
