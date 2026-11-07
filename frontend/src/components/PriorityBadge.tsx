import React from 'react';
import { PriorityLevel } from '../types';
import clsx from 'clsx';

const BADGE_STYLES: Record<PriorityLevel, { bg: string; text: string; label: string; labelAr: string }> = {
  critical: { bg: '#FEE2E2', text: '#DC2626', label: 'Critical', labelAr: 'حرج' },
  high: { bg: '#FEF3C7', text: '#D97706', label: 'High', labelAr: 'مرتفع' },
  medium: { bg: '#DBEAFE', text: '#2563EB', label: 'Medium', labelAr: 'متوسط' },
  low: { bg: '#D1FAE5', text: '#059669', label: 'Low', labelAr: 'منخفض' },
};

interface PriorityBadgeProps {
  priority: PriorityLevel | string;
  isArabic?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  isArabic = false,
  className,
}) => {
  const normPriority = (priority?.toLowerCase() || 'medium') as PriorityLevel;
  const config = BADGE_STYLES[normPriority] || BADGE_STYLES.medium;

  return (
    <span
      className={clsx('decidix-pill-badge', className)}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {isArabic ? config.labelAr : config.label}
    </span>
  );
};
