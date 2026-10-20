import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  pill?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5'
  };

  const roundedStyles = pill ? 'rounded-full' : 'rounded-xl';

  const variantStyles = {
    primary: 'bg-terracotta-500 hover:bg-terracotta-600 text-white shadow-sm hover:shadow active:bg-terracotta-700',
    secondary: 'bg-white hover:bg-canvas-200 text-stone-800 border border-canvas-border shadow-card hover:border-stone-300',
    dark: 'bg-olive-900 hover:bg-olive-850 text-white border border-olive-750 shadow-sm',
    outline: 'bg-transparent border border-canvas-border hover:bg-canvas-200 text-stone-700',
    ghost: 'bg-transparent hover:bg-canvas-200 text-stone-600 hover:text-stone-900',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${roundedStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </button>
  );
};
