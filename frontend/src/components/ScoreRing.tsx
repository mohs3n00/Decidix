import React from 'react';
import clsx from 'clsx';

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

/**
 * ScoreRing: Authentic circular score gauge matching Flutter ScoreRing.
 * Track color: #EAF0F8. Progress color follows performance band.
 */
export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  maxScore = 100,
  size = 56,
  strokeWidth = 5,
  color,
  className,
  showLabel = true,
}) => {
  const normalizedScore = Math.max(0, Math.min(score, maxScore));
  const progressRatio = normalizedScore / maxScore;

  const defaultColor =
    normalizedScore >= 75
      ? 'var(--color-success)'
      : normalizedScore >= 60
      ? 'var(--color-blue)'
      : 'var(--color-danger)';

  const strokeColor = color || defaultColor;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div
      className={clsx('relative inline-flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={maxScore}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-track)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {showLabel && (
        <span
          className="absolute inset-0 flex items-center justify-center font-bold text-navy"
          style={{ fontSize: Math.max(11, Math.round(size * 0.28)) }}
        >
          {score.toFixed(0)}
        </span>
      )}
    </div>
  );
};
