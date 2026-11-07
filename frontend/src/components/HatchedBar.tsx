import React from 'react';
import clsx from 'clsx';

interface HatchedBarProps {
  percentage: number;
  height?: number;
  className?: string;
  showHatch?: boolean;
}

/**
 * HatchedBar: Authentic Decidix progress bar.
 * The filled portion uses the brand gradient (blue to cyan).
 * The remaining portion displays subtle diagonal hatch stripes.
 */
export const HatchedBar: React.FC<HatchedBarProps> = ({
  percentage,
  height = 10,
  className,
  showHatch = true,
}) => {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div
      className={clsx('w-full rounded-pill overflow-hidden relative select-none', className)}
      style={{
        height: `${height}px`,
        backgroundColor: 'var(--color-track)',
      }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background Hatched Pattern for remaining distance */}
      {showHatch && (
        <div
          className="absolute inset-0 w-full h-full decidix-hatched-pattern opacity-60"
        />
      )}

      {/* Filled Gradient Bar */}
      <div
        className="h-full rounded-pill relative z-10 transition-all duration-500 ease-out"
        style={{
          width: `${clamped}%`,
          background: 'linear-gradient(90deg, var(--color-blue) 0%, var(--color-cyan) 100%)',
        }}
      />
    </div>
  );
};
