import React from 'react';
import clsx from 'clsx';

interface StatWellProps {
  value: string | number;
  label: string;
  dark?: boolean;
  className?: string;
  sublabel?: string;
  subtext?: string;
}

/**
 * StatWell: 18px rounded inner stat tile that sits cleanly inside a hero card or card.
 */
export const StatWell: React.FC<StatWellProps> = ({
  value,
  label,
  dark = false,
  className,
  sublabel,
  subtext,
}) => {
  const subtitle = sublabel || subtext;

  return (
    <div
      className={clsx(
        'rounded-well px-4 py-3 flex flex-col items-center justify-center text-center transition-all',
        dark
          ? 'bg-white/5 border border-white/10 text-white'
          : 'bg-white/80 border border-hairline shadow-sm text-navy',
        className
      )}
      style={{ borderRadius: 'var(--radius-well)' }}
    >
      <div className="text-xl md:text-2xl font-bold tracking-tight">
        {value}
      </div>
      <div
        className={clsx(
          'text-xs font-medium mt-0.5 truncate max-w-full',
          dark ? 'text-white/70' : 'text-ink'
        )}
      >
        {label}
      </div>
      {subtitle && (
        <div
          className={clsx(
            'text-[10px] mt-0.5',
            dark ? 'text-cyan' : 'text-faded-ink'
          )}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
