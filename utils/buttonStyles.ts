/**
 * Button style utilities
 * Provides consistent button styling across the application
 */

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
}

/**
 * Get button class names based on variant and size
 */
export const getButtonClasses = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
}: ButtonStyleOptions = {}): string => {
  const baseClasses = 'font-semibold rounded-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size classes
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  // Variant classes
  const variantClasses = {
    primary: disabled
      ? 'bg-indigo-400 text-white cursor-not-allowed'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white transform hover:scale-105 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600',
    secondary: disabled
      ? 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400'
      : 'bg-slate-200 hover:bg-slate-300 text-slate-800 focus:ring-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200',
    tertiary: disabled
      ? 'bg-transparent text-slate-400 cursor-not-allowed'
      : 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-300 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
    success: disabled
      ? 'bg-green-400 text-white cursor-not-allowed'
      : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 dark:bg-green-500 dark:hover:bg-green-600',
    danger: disabled
      ? 'bg-red-400 text-white cursor-not-allowed'
      : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass}`.trim();
};

/**
 * Predefined button style presets for common use cases
 */
export const buttonPresets = {
  // Primary actions
  primaryAction: getButtonClasses({ variant: 'primary', size: 'lg' }),
  primaryActionSmall: getButtonClasses({ variant: 'primary', size: 'sm' }),
  
  // Secondary actions
  secondaryAction: getButtonClasses({ variant: 'secondary', size: 'md' }),
  secondaryActionSmall: getButtonClasses({ variant: 'secondary', size: 'sm' }),
  
  // Success actions (downloads, confirmations)
  successAction: getButtonClasses({ variant: 'success', size: 'md' }),
  
  // Danger actions (delete, reset)
  dangerAction: getButtonClasses({ variant: 'danger', size: 'md' }),
  
  // Tertiary actions (cancel, back)
  tertiaryAction: getButtonClasses({ variant: 'tertiary', size: 'md' }),
};

