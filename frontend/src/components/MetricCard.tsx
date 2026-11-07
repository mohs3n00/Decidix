import React from 'react';
import { Metric } from '../types';
import { TrendIndicator } from './TrendIndicator';
import { DecidixIcon, DecidixIconName } from './DecidixIcon';
import clsx from 'clsx';

interface MetricCardProps {
  metric: Metric;
  isArabic?: boolean;
  icon?: DecidixIconName;
  className?: string;
  onClick?: () => void;
}

/**
 * MetricCard: Authentic Decidix KPI card.
 * 24px border radius (AppRadius.row), hairline border, soft card shadow.
 * Features 12px ink caption label, 28px numberL value, sparkline, and TrendIndicator.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  isArabic = false,
  icon,
  className,
  onClick,
}) => {
  const isPositive = (metric.change ?? 0) >= 0;
  const isGood =
    metric.higher_is_better !== undefined
      ? (metric.higher_is_better ? isPositive : !isPositive)
      : isPositive;

  const displayLabel = isArabic && metric.arabic_label ? metric.arabic_label : metric.label;

  // Minimal SVG sparkline
  const renderSparkline = (points: number[]) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 76;
    const height = 24;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <svg width={width} height={height} className="overflow-visible shrink-0 opacity-80">
        <polyline
          fill="none"
          stroke={isGood ? 'var(--color-success)' : 'var(--color-danger)'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords.join(' ')}
        />
      </svg>
    );
  };

  const formatValue = (val: number, unit?: string) => {
    if (unit === 'percent') return `${val.toFixed(1)}%`;
    if (unit === 'usd') return `$${val.toLocaleString()}`;
    if (unit === 'years') return `${val} yrs`;
    if (unit === 'score_100') return `${val}/100`;
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={clsx(
        'decidix-card-row p-4 flex flex-col justify-between gap-3 text-navy select-none',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      style={{
        borderRadius: 'var(--radius-row)',
        border: '1px solid var(--color-hairline)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Top Label & Sparkline / Icon */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && (
            <DecidixIcon
              name={icon}
              size={14}
              color="var(--color-blue)"
              className="shrink-0"
            />
          )}
          <span className="text-xs font-medium text-ink truncate">
            {displayLabel}
          </span>
        </div>

        {metric.sparkline && renderSparkline(metric.sparkline)}
      </div>

      {/* Value & Change */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="type-number-l text-navy tracking-tight truncate">
          {formatValue(metric.value, metric.unit)}
        </div>

        {metric.change !== undefined && (
          <TrendIndicator
            value={metric.change}
            inverted={metric.higher_is_better === false}
            size="sm"
          />
        )}
      </div>
    </div>
  );
};
