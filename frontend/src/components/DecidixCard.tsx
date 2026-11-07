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
 * DecidixCard: The fundamental container component in Decidix.
 * - 'card': 28px border-radius, hairline border, light floating shadow.
 * - 'row': 24px border-radius, used for list rows and dense KPI tiles.
 * - 'well': 18px border-radius, tinted background for inner stat wells.
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
        'transition-all duration-200 text-navy',
        variant === 'card' && 'bg-white border border-hairline rounded-card shadow-decidix-card p-5 md:p-6',
        variant === 'row' && 'bg-white border border-hairline rounded-row shadow-decidix-card p-4',
        variant === 'well' && 'bg-well border border-hairline rounded-well p-4',
        isClickable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
