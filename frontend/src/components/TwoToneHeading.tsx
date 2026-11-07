import React from 'react';
import clsx from 'clsx';

interface TwoToneHeadingProps {
  first: string;
  second: string;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

export const TwoToneHeading: React.FC<TwoToneHeadingProps> = ({
  first,
  second,
  level = 2,
  className,
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag className={clsx('heading-twotone tracking-tight', className)}>
      <span className="first-word font-bold text-navy">{first}</span>
      <span className="second-word font-normal text-faded-ink">{second}</span>
    </Tag>
  );
};
