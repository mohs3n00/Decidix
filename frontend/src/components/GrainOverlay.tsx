import React from 'react';

interface GrainOverlayProps {
  opacity?: number;
  className?: string;
}

export const GrainOverlay: React.FC<GrainOverlayProps> = ({ opacity = 0.14, className = '' }) => {
  return (
    <svg
      className={`grain-overlay ${className}`}
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <filter id="decidix-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#decidix-grain)" />
    </svg>
  );
};
