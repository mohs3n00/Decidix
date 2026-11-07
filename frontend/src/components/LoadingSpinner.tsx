import React from 'react';
import clsx from 'clsx';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading platform data...',
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center p-12 text-center', className)}>
      <div className="w-10 h-10 border-4 border-blue/20 border-t-blue rounded-full animate-spin"></div>
      {message && <p className="mt-4 text-sm font-medium text-ink">{message}</p>}
    </div>
  );
};
