import React from 'react';
import clsx from 'clsx';

export type DecidixIconName =
  | 'overview'
  | 'insights'
  | 'intelligence'
  | 'decisions'
  | 'account'
  | 'spark'
  | 'education'
  | 'healthcare'
  | 'economy'
  | 'infrastructure'
  | 'location'
  | 'search'
  | 'trend_up'
  | 'trend_down'
  | 'notifications'
  | 'back'
  | 'next'
  | 'logo_navy'
  | 'logo_white';

const ICON_PATHS: Record<DecidixIconName, string> = {
  overview: '/icons/ic_overview.svg',
  insights: '/icons/ic_insights.svg',
  intelligence: '/icons/ic_intelligence.svg',
  decisions: '/icons/ic_decisions.svg',
  account: '/icons/ic_account.svg',
  spark: '/icons/ic_ai_spark.svg',
  education: '/icons/ic_education.svg',
  healthcare: '/icons/ic_healthcare.svg',
  economy: '/icons/ic_economy.svg',
  infrastructure: '/icons/ic_infrastructure.svg',
  location: '/icons/ic_location.svg',
  search: '/icons/ic_search.svg',
  trend_up: '/icons/ic_trend_up.svg',
  trend_down: '/icons/ic_trend_down.svg',
  notifications: '/icons/ic_notifications.svg',
  back: '/icons/ic_back.svg',
  next: '/icons/ic_next.svg',
  logo_navy: '/icons/Asset 2.svg',
  logo_white: '/icons/Asset 3.svg',
};

interface DecidixIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: DecidixIconName;
  size?: number | string;
  className?: string;
  color?: string; // e.g. '#2563EB', 'currentColor'
}

export const DecidixIcon: React.FC<DecidixIconProps> = ({
  name,
  size = 20,
  className,
  color,
  style,
  ...props
}) => {
  const iconPath = ICON_PATHS[name];
  const sizePx = typeof size === 'number' ? `${size}px` : size;

  // For logos, render directly as img
  if (name === 'logo_navy' || name === 'logo_white') {
    return (
      <img
        src={iconPath}
        alt={name}
        style={{ width: sizePx, height: 'auto', ...style }}
        className={className}
      />
    );
  }

  // Render via CSS mask so currentColor or custom color fills the exact SVG shape
  return (
    <span
      role="img"
      aria-label={name}
      className={clsx('inline-block align-middle select-none', className)}
      style={{
        width: sizePx,
        height: sizePx,
        backgroundColor: color || 'currentColor',
        WebkitMaskImage: `url(${iconPath})`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskImage: `url(${iconPath})`,
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
        ...style,
      }}
      {...props}
    />
  );
};
