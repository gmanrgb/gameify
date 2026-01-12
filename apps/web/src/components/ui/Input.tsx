import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 
            bg-bg-tertiary border border-white/10 rounded-lg
            text-text-primary placeholder:text-text-secondary/50
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {helper && !error && (
          <p className="text-sm text-text-secondary">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
