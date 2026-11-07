import React from 'react';
import clsx from 'clsx';

interface AiInsightPanelProps {
  label: string;
  body: string;
  confidence?: number;
  className?: string;
}

/**
 * AiInsightPanel: Signature Navy card with a cyan label and luminous cyan glow.
 * Used for "AI INSIGHT", "GAP ANALYSIS", and "SIMULATION NOTE".
 */
export const AiInsightPanel: React.FC<AiInsightPanelProps> = ({
  label,
  body,
  confidence,
  className,
}) => {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-card bg-navy p-5 text-white shadow-lg transition-all duration-300',
        className
      )}
      style={{
        borderRadius: 'var(--radius-card)',
        backgroundColor: 'var(--color-navy)',
      }}
    >
      {/* Top-Right Soft Cyan Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 rtl:-right-auto rtl:-left-10 w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(33, 234, 244, 0.28) 0%, rgba(33, 234, 244, 0) 70%)',
        }}
      />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan">
              {label}
            </span>
          </div>

          {confidence !== undefined && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-white/10 text-cyan">
              {confidence}% Confidence
            </span>
          )}
        </div>

        <p className="text-sm font-normal leading-relaxed text-white/90">
          {body}
        </p>
      </div>
    </div>
  );
};
