import React from 'react';

interface GlassStatCardProps {
  metric: string | number;
  caption: string;
  delta?: string;
  unit?: string;
  className?: string;
}

export const GlassStatCard: React.FC<GlassStatCardProps> = ({
  metric,
  caption,
  delta,
  unit,
  className = '',
}) => {
  return (
    <div className={`glass-stat-card ${className}`}>
      <div className="text-3xl font-bold tabular-nums text-white leading-none">
        {metric}
        {unit && <span className="text-lg font-medium text-white/60 ml-1">{unit}</span>}
      </div>
      {delta && (
        <div
          className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(33,234,244,0.15)', color: '#21EAF4' }}
        >
          {delta}
        </div>
      )}
      <div className="text-sm text-white/60 mt-2 leading-snug">{caption}</div>
    </div>
  );
};
