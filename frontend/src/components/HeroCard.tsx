import React from 'react';
import clsx from 'clsx';

interface HeroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

/**
 * HeroCard: Flagship Decidix hero container.
 * Features 32px radius, pale white-to-heroTint gradient, 1px white hairline,
 * floating hero shadow, and an authentic top-right radial cyan glow.
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
        'decidix-hero-card relative overflow-hidden transition-all duration-300',
        padding,
        className
      )}
      style={{
        borderRadius: 'var(--radius-hero)',
        background: 'linear-gradient(135deg, #FFFFFF 0%, var(--color-hero-tint) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: 'var(--shadow-hero)',
        ...style,
      }}
      {...props}
    >
      {/* Signature Top-Right Cyan Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 rtl:-right-auto rtl:-left-12 w-60 h-60 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(33, 234, 244, 0.32) 0%, rgba(33, 234, 244, 0) 70%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
