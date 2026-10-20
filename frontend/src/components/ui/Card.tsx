import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'dark' | 'outline';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-canvas-border shadow-card',
    subtle: 'bg-canvas-100 border border-canvas-border',
    dark: 'bg-olive-850 text-white border border-olive-750',
    outline: 'bg-transparent border border-canvas-border'
  };

  const hoverStyles = hoverEffect ? 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5' : '';

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
