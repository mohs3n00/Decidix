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
  | 'logo_white'
  | 'splash_mark'
  // Vector operational icons replacing emojis and unicode:
  | 'check'
  | 'close'
  | 'lock'
  | 'eye'
  | 'eye_slash'
  | 'mail'
  | 'warning'
  | 'info'
  | 'shield'
  | 'arrow_right'
  | 'arrow_left'
  | 'arrow_up_right'
  | 'arrow_down_right'
  | 'chevron_right'
  | 'chevron_left'
  | 'chevron_down'
  | 'chevron_up'
  | 'copy'
  | 'refresh'
  | 'upload'
  | 'filter'
  | 'user'
  | 'users'
  | 'team'
  | 'globe'
  | 'trash'
  | 'plus'
  | 'dataset'
  | 'clock'
  | 'robot'
  | 'x'
  | 'file'
  | 'download';

const FLUTTER_ICON_PATHS: Partial<Record<DecidixIconName, string>> = {
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

interface DecidixIconProps extends React.HTMLAttributes<HTMLElement> {
  name: DecidixIconName;
  size?: number | string;
  className?: string;
  color?: string; // e.g. '#2563EB', 'currentColor'
  strokeWidth?: number;
}

export const DecidixIcon: React.FC<DecidixIconProps> = ({
  name,
  size = 20,
  className,
  color = 'currentColor',
  strokeWidth = 2,
  style,
  ...props
}) => {
  const sizePx = typeof size === 'number' ? `${size}px` : size;

  // 1. Official Brand Splash Mark (Image)
  if (name === 'splash_mark') {
    return (
      <img
        src="/splash_mark.png"
        alt="Decidix Brand Mark"
        style={{ width: sizePx, height: sizePx, objectFit: 'contain', ...style }}
        className={clsx('inline-block select-none', className)}
        {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  // 2. Official SVG Logos
  if (name === 'logo_navy' || name === 'logo_white') {
    const logoSrc = FLUTTER_ICON_PATHS[name];
    return (
      <img
        src={logoSrc}
        alt={name}
        style={{ width: sizePx, height: 'auto', ...style }}
        className={clsx('inline-block select-none', className)}
        {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  // 3. Operational Vector SVG Icons (Crisp, modern, zero network dependency)
  switch (name) {
    case 'check':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case 'x':
    case 'close':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );

    case 'lock':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );

    case 'eye':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    case 'eye_slash':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      );

    case 'mail':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );

    case 'warning':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );

    case 'info':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );

    case 'shield':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );

    case 'arrow_right':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0 rtl:rotate-180 transition-transform', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );

    case 'arrow_left':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0 rtl:rotate-180 transition-transform', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      );

    case 'arrow_up_right':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0 rtl:-scale-x-100 transition-transform', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      );

    case 'arrow_down_right':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0 rtl:-scale-x-100 transition-transform', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="7" y1="7" x2="17" y2="17" />
          <polyline points="17 7 17 17 7 17" />
        </svg>
      );

    case 'chevron_right':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0 rtl:rotate-180 transition-transform', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );

    case 'chevron_left':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0 rtl:rotate-180 transition-transform', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );

    case 'upload':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );

    case 'filter':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      );

    case 'copy':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );

    case 'refresh':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );

    case 'chevron_down':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );

    case 'chevron_up':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      );

    case 'user':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );

    case 'users':
    case 'team':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case 'globe':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );

    case 'trash':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );

    case 'plus':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );

    case 'dataset':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );

    case 'clock':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );

    case 'robot':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16.01" />
          <line x1="16" y1="16" x2="16" y2="16.01" />
        </svg>
      );

    case 'file':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );

    case 'download':
      return (
        <svg
          style={{ width: sizePx, height: sizePx, ...style }}
          className={clsx('inline-block align-middle select-none shrink-0', className)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
  }

  // 4. Flutter domain icons (CSS mask fills SVG geometry)
  const iconPath = FLUTTER_ICON_PATHS[name];
  if (!iconPath) {
    return null;
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={clsx('inline-block align-middle select-none shrink-0', className)}
      style={{
        width: sizePx,
        height: sizePx,
        backgroundColor: color,
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
