import React from 'react';
import { Metric } from '../types';
import { DecidixIcon } from './DecidixIcon';
import clsx from 'clsx';

interface MetricCardProps {
  metric: Metric;
  isArabic?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  isArabic = false,
  className,
}) => {
  const isPositive = (metric.change || 0) >= 0;
  const isGood = metric.higher_is_better !== undefined
    ? (metric.higher_is_better ? isPositive : !isPositive)
    : isPositive;

  const displayLabel = isArabic && metric.arabic_label ? metric.arabic_label : metric.label;

  // Render a minimal SVG sparkline if sparkline data is present
  const renderSparkline = (points: number[]) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 80;
    const height = 28;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={isGood ? '#10B981' : '#EF4444'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords.join(' ')}
        />
      </svg>
    );
  };

  const formatValue = (val: number, unit?: string) => {
    if (unit === 'percent') return `${val}%`;
    if (unit === 'usd') return `$${val.toLocaleString()}`;
    if (unit === 'years') return `${val} yrs`;
    if (unit === 'score_100') return `${val}/100`;
    return val.toLocaleString();
  };

  return (
    <div className={clsx('decidix-card p-5 flex flex-col justify-between gap-3', className)}>
      <div className="flex items-center justify-between text-sm font-medium text-ink">
        <span className="truncate">{displayLabel}</span>
        {metric.sparkline && renderSparkline(metric.sparkline)}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-navy tracking-tight">
          {formatValue(metric.value, metric.unit)}
        </div>

        {metric.change !== undefined && (
          <div
            className={clsx(
              'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-pill',
              isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            )}
          >
            <DecidixIcon
              name={isPositive ? 'trend_up' : 'trend_down'}
              size={12}
              color={isGood ? '#059669' : '#DC2626'}
            />
            <span>
              {isPositive ? '+' : ''}
              {metric.change}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
