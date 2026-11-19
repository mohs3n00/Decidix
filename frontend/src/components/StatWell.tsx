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
 * StatWell: 12px (rounded-xl) inner stat tile with crisp SaaS aesthetic.
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
        'rounded-xl px-4 py-3 flex flex-col items-center justify-center text-center transition-all',
        dark
          ? 'bg-white/5 border border-white/10 text-white'
          : 'bg-white border border-slate-200/80 shadow-xs text-navy',
        className
      )}
    >
      <div className="text-xl md:text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </div>
      <div
        className={clsx(
          'text-xs font-medium mt-0.5 truncate max-w-full',
          dark ? 'text-white/70' : 'text-slate-500'
        )}
      >
        {label}
      </div>
      {subtitle && (
        <div
          className={clsx(
            'text-[11px] mt-0.5 font-medium truncate max-w-full',
            dark ? 'text-cyan' : 'text-slate-400'
          )}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
