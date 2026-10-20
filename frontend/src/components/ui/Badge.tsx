import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'terracotta' | 'neutral' | 'dark' | 'warning' | 'info';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs'
  };

  const variantStyles = {
    success: 'bg-sage-50 text-sage-700 border border-sage-200 font-medium',
    terracotta: 'bg-terracotta-50 text-terracotta-700 border border-terracotta-200 font-medium',
    neutral: 'bg-canvas-200 text-stone-600 border border-canvas-border font-medium',
    dark: 'bg-olive-800 text-olive-100 border border-olive-700 font-medium',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
    info: 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
  };

  const dotColors = {
    success: 'bg-sage-500',
    terracotta: 'bg-terracotta-500',
    neutral: 'bg-stone-400',
    dark: 'bg-olive-400',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
