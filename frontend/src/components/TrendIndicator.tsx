import React from 'react';
import { DecidixIcon } from './DecidixIcon';
import clsx from 'clsx';

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  inverted?: boolean; // True if negative change is good (e.g. poverty, unemployment)
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * TrendIndicator: Authentic Decidix delta pill.
 * Follows Figma specification: the direction and color communicate the trend,
 * avoiding redundant +/- signs when an authentic SVG trend icon is shown.
 */
export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  suffix = '%',
  inverted = false,
  className,
  size = 'md',
}) => {
  const isPositive = value >= 0;
  const isGood = inverted ? !isPositive : isPositive;

  const textColor = isGood ? 'var(--color-success-text)' : 'var(--color-danger-text)';
  const bgColor = isGood ? 'var(--color-success-soft)' : 'var(--color-danger-soft)';
  const iconName = isPositive ? 'trend_up' : 'trend_down';

  const formattedText = `${Math.abs(value).toFixed(1)}${suffix}`;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 font-semibold rounded-pill select-none shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <DecidixIcon
        name={iconName}
        size={size === 'sm' ? 10 : 12}
        color={textColor}
      />
      <span className="font-bold tracking-tight">{formattedText}</span>
    </div>
  );
};
