import React from 'react';
import clsx from 'clsx';

interface HeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

/**
 * HeroCard: Flagship Decidix hero container with crisp SaaS aesthetic.
 * Features 16px (rounded-2xl) radius, pale white-to-light-blue gradient,
 * crisp 1px border, ultra-subtle shadow, and subtle radial cyan glow.
 */
export const HeroCard: React.FC<HeroCardProps> = ({
  children,
  className,
  padding = 'p-6 md:p-8',
  style,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'decidix-hero-card relative overflow-hidden transition-all duration-200 rounded-2xl border border-slate-200/80 shadow-xs',
        padding,
        className
      )}
      style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
        ...style,
      }}
      {...props}
    >
      {/* Signature Top-Right Cyan Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-16 rtl:-right-auto rtl:-left-16 w-64 h-64 rounded-full opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(33, 234, 244, 0.25) 0%, rgba(37, 99, 235, 0.05) 45%, transparent 70%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
