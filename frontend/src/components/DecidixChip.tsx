import React from 'react';
import clsx from 'clsx';

interface DecidixChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * DecidixChip: 36px high pill chip.
 * Selected: Navy with white text.
 * Unselected: White with hairline border and ink text.
 */
export const DecidixChip: React.FC<DecidixChipProps> = ({
  label,
  selected = false,
  icon,
  className,
  ...props
}) => {
  return (
    <button
      type="button"
      className={clsx(
        'decidix-chip inline-flex items-center gap-2 select-none whitespace-nowrap',
        selected && 'active',
        className
      )}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
