import React from 'react';
import clsx from 'clsx';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-slate-100/90 rounded-md',
        className
      )}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={clsx(
        'bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
};

export const SkeletonMetrics: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={clsx(
        'bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="h-52 w-full flex items-end gap-3 pt-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${25 + ((i * 19) % 65)}%` }}
          />
        ))}
      </div>
    </div>
  );
};
