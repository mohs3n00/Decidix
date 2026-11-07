import React from 'react';
import clsx from 'clsx';

interface TwoToneHeadingProps {
  eyebrow?: string;
  first: string;
  second: string;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

export const TwoToneHeading: React.FC<TwoToneHeadingProps> = ({
  eyebrow,
  first,
  second,
  level = 2,
  className,
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const content = (
    <Tag className={clsx('heading-twotone tracking-tight', className)}>
      <span className="first-word font-bold text-navy">{first}</span>{' '}
      <span className="second-word font-normal text-faded-ink">{second}</span>
    </Tag>
  );

  if (eyebrow) {
    return (
      <div className="flex flex-col">
        <span className="text-[12px] font-semibold tracking-wider text-blue uppercase mb-1">
          {eyebrow}
        </span>
        {content}
      </div>
    );
  }

  return content;
};
