import React from 'react';
import { PriorityLevel } from '../types';
import clsx from 'clsx';

const BADGE_STYLES: Record<PriorityLevel, { bg: string; text: string; label: string; labelAr: string }> = {
  critical: {
    bg: 'rgba(229, 72, 77, 0.12)',
    text: 'var(--color-danger-text)',
    label: 'Critical',
    labelAr: 'حرج',
  },
  high: {
    bg: 'rgba(229, 72, 77, 0.10)',
    text: 'var(--color-danger-text)',
    label: 'High',
    labelAr: 'مرتفع',
  },
  medium: {
    bg: 'rgba(245, 165, 36, 0.15)',
    text: 'var(--color-warning-text)',
    label: 'Medium',
    labelAr: 'متوسط',
  },
  low: {
    bg: 'rgba(20, 184, 122, 0.12)',
    text: 'var(--color-success-text)',
    label: 'Low',
    labelAr: 'منخفض',
  },
};

interface PriorityBadgeProps {
  priority: PriorityLevel | string;
  isArabic?: boolean;
  className?: string;
}

/**
 * PriorityBadge: Authentic Decidix priority status badge.
 * Uses exact token colors: successText (#0A8F5C), warningText (#A56A00), dangerText (#C9353A).
 */
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  isArabic = false,
  className,
}) => {
  const normPriority = (priority?.toLowerCase() || 'medium') as PriorityLevel;
  const config = BADGE_STYLES[normPriority] || BADGE_STYLES.medium;

  return (
    <span
      className={clsx(
        'inline-flex items-center select-none font-semibold uppercase tracking-wider text-[11px] px-2.5 py-0.5 rounded-pill',
        className
      )}
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {isArabic ? config.labelAr : config.label}
    </span>
  );
};
