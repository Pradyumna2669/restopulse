import React from 'react';
import { Check } from 'lucide-react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'check-circle' | 'switch';
  label?: string;
  description?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  variant = 'check-circle',
  label,
  description
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const control = variant === 'check-circle' ? (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-150 focus:outline-none ${
        size === 'sm' ? 'w-6 h-6' : 'w-7 h-7'
      } ${
        checked
          ? 'bg-stone-900 text-white shadow-sm'
          : 'bg-stone-200 hover:bg-stone-300 text-transparent'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Check className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} stroke-[3] transition-transform ${checked ? 'scale-100' : 'scale-50'}`} />
    </button>
  ) : (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-terracotta-500' : 'bg-stone-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (!label && !description) {
    return control;
  }

  return (
    <div
      onClick={handleToggle}
      className={`flex items-center justify-between py-3.5 cursor-pointer select-none group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="pr-4">
        {label && <p className="text-sm font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">{label}</p>}
        {description && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {control}
    </div>
  );
};
