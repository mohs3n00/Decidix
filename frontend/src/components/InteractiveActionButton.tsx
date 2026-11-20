import React from 'react';
import { DecidixIcon } from './DecidixIcon';
import { useLanguage } from '../context/LanguageContext';

interface InteractiveActionButtonProps {
  label?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'dark' | 'light'; // dark = on dark backgrounds (white button), light = on light backgrounds (navy button)
  className?: string;
  as?: 'button' | 'a';
}

export const InteractiveActionButton: React.FC<InteractiveActionButtonProps> = ({
  label,
  children,
  onClick,
  href,
  variant = 'dark',
  className = '',
  as: Tag = 'button',
}) => {
  const { isRTL } = useLanguage();
  const cls = variant === 'dark' ? 'btn-pill-dark' : 'btn-pill-light';
  const text = children || label;

  const inner = (
    <>
      <span className="flex-1 text-sm font-medium leading-none px-2">{text}</span>
      <span className="btn-icon-circle">
        <DecidixIcon name="arrow_right" size={16} color="currentColor" />
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={`${cls} ${className}`}>
        {inner}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`${cls} ${className}`} type="button">
      {inner}
    </button>
  );
};
